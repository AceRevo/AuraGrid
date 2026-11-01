/**
 * Snap, Resize & Fusion Engine
 * 
 * Manages Cube drag-and-drop, proximity magnetic detection,
 * morphing fusion into unified rectangular clusters, elastic decoupling,
 * smooth resizing/deforming, and individual/global position locking.
 * 
 * Featuring:
 * - Robust Pointer Capture for ultra-smooth drag tracking
 * - Corner Resize Handle (⤡) with live width/height morphing
 * - Quick Shape Deformer (1:1, 16:9, 9:16, 2:1)
 * - Position Lock / Unlock (drag disabled, but all controls 100% interactive)
 * - Dynamic pin activation (hidden at rest, glowing on drag)
 * 
 * Open Source - Antigravity CubeWorld Architecture
 */

export class SnapEngine {
  constructor(workspaceEl, snapGuideEl) {
    this.workspace = workspaceEl;
    this.snapGuide = snapGuideEl;
    this.widgets = [];
    this.clusters = [];
    this.activeDrag = null;
    this.activeResize = null;
    this.snapCandidate = null;

    this.CUBE_SIZE = 200;
    this.SNAP_THRESHOLD = 45;
    this.isLocked = false; // Global position lock flag

    this.onConnectionChange = null;
    this.onWidgetDeleted = null;
    this.onLayoutChanged = null;

    this.initGlobalListeners();
  }

  registerWidget(widget) {
    if (!this.widgets.includes(widget)) {
      this.widgets.push(widget);
    }
    if (!widget.element.parentElement) {
      this.workspace.appendChild(widget.element);
    }
    widget.setEngine(this);
  }

  removeWidget(widget) {
    if (widget.cluster) {
      this.uncoupleCluster(widget.cluster);
    }

    if (widget.isCustom) {
      widget.element.remove();
      this.widgets = this.widgets.filter(w => w !== widget);
      if (this.onWidgetDeleted) {
        this.onWidgetDeleted(widget);
      }
    } else {
      widget.element.style.display = 'none';
      if (typeof window !== 'undefined' && window.settings && typeof window.settings.setWidgetActive === 'function') {
        window.settings.setWidgetActive(widget.id, false);
      }
      if (typeof window !== 'undefined' && typeof window.syncWidgetVisibilityWithConfig === 'function') {
        window.syncWidgetVisibilityWithConfig();
      }
    }

    if (this.onLayoutChanged) {
      this.onLayoutChanged();
    }
  }

  setGlobalLock(locked) {
    this.isLocked = locked;
    document.body.classList.toggle('cubes-locked', locked);
    this.widgets.forEach(w => w.setLocked(locked, false));
    if (this.onLayoutChanged) {
      this.onLayoutChanged();
    }
  }

  initGlobalListeners() {
    window.addEventListener('pointermove', (e) => {
      this.handlePointerMove(e);
      this.handleResizeMove(e);
    });
    window.addEventListener('pointerup', (e) => {
      this.handlePointerUp(e);
      this.handleResizeUp(e);
    });
    window.addEventListener('pointercancel', (e) => {
      this.handlePointerUp(e);
      this.handleResizeUp(e);
    });
    window.addEventListener('resize', () => {
      this.clampAllToScreen();
    });
  }

  clampAllToScreen() {
    this.widgets.forEach(w => {
      if (!w.cluster && w.element && w.element.style.display !== 'none') {
        w.setPosition(w.x, w.y);
      }
    });
    this.clusters.forEach(c => {
      c.setPosition(c.x, c.y);
    });
  }

  startDrag(entity, e) {
    // If locked globally or individually, do not drag!
    if (this.isLocked || entity.isLocked) return;

    e.preventDefault();

    const rect = entity.element.getBoundingClientRect();
    const wsRect = this.workspace.getBoundingClientRect();

    this.activeDrag = {
      entity,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: rect.left - wsRect.left,
      initialTop: rect.top - wsRect.top
    };

    try {
      entity.element.setPointerCapture(e.pointerId);
    } catch (err) {}

    entity.element.classList.add('is-dragging');
    document.body.classList.add('is-dragging-any');
  }

  handlePointerMove(e) {
    if (!this.activeDrag) return;

    const { entity, startX, startY, initialLeft, initialTop } = this.activeDrag;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Desktop safe boundaries with margin
    const margin = 16;
    const bottomMargin = 28;
    const screenW = window.innerWidth || 1920;
    const screenH = window.innerHeight || 1080;
    const entW = entity.width || (entity.element ? entity.element.offsetWidth : 200);
    const entH = entity.height || (entity.element ? entity.element.offsetHeight : 200);
    const maxLeft = Math.max(margin, screenW - entW - margin);
    const maxTop = Math.max(margin, screenH - entH - bottomMargin);

    const newX = Math.max(margin, Math.min(maxLeft, initialLeft + dx));
    const newY = Math.max(margin, Math.min(maxTop, initialTop + dy));

    entity.setPosition(newX, newY);

    if (!entity.isLocked) {
      this.checkMagneticProximity(entity);
    }
  }

  handlePointerUp(e) {
    if (!this.activeDrag) return;

    const { entity, pointerId } = this.activeDrag;

    try {
      if (pointerId !== undefined && entity.element.hasPointerCapture(pointerId)) {
        entity.element.releasePointerCapture(pointerId);
      }
    } catch (err) {}

    entity.element.classList.remove('is-dragging');
    document.body.classList.remove('is-dragging-any');

    if (this.snapCandidate) {
      this.fuseEntities(
        this.snapCandidate.target,
        this.snapCandidate.dragged,
        this.snapCandidate.orientation,
        this.snapCandidate.position
      );
      this.clearSnapFeedback();
    }

    this.clearPins();
    this.activeDrag = null;

    if (this.onLayoutChanged) {
      this.onLayoutChanged();
    }
  }

  startResize(widget, e) {
    if (this.isLocked || widget.isLocked) return;

    e.preventDefault();
    e.stopPropagation();

    this.activeResize = {
      widget,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialW: widget.width,
      initialH: widget.height
    };

    try {
      widget.element.setPointerCapture(e.pointerId);
    } catch (err) {}

    widget.element.classList.add('is-resizing');
  }

  handleResizeMove(e) {
    if (!this.activeResize) return;

    const { widget, startX, startY, initialW, initialH } = this.activeResize;
    const dw = e.clientX - startX;
    const dh = e.clientY - startY;

    const screenW = window.innerWidth || 1920;
    const screenH = window.innerHeight || 1080;
    const maxAllowedW = Math.max(160, screenW - widget.x - 16);
    const maxAllowedH = Math.max(160, screenH - widget.y - 28);

    const newW = Math.max(160, Math.min(maxAllowedW, initialW + dw));
    const newH = Math.max(160, Math.min(maxAllowedH, initialH + dh));

    widget.setDimensions(newW, newH);
  }

  handleResizeUp(e) {
    if (!this.activeResize) return;

    const { widget, pointerId } = this.activeResize;
    try {
      if (pointerId !== undefined && widget.element.hasPointerCapture(pointerId)) {
        widget.element.releasePointerCapture(pointerId);
      }
    } catch (err) {}

    widget.element.classList.remove('is-resizing');
    this.activeResize = null;

    if (this.onLayoutChanged) {
      this.onLayoutChanged();
    }
  }

  checkMagneticProximity(dragged) {
    const dRect = dragged.getBounds();
    this.clearPins();

    let closest = null;
    let minDistance = this.SNAP_THRESHOLD; // ~45px magnetic radius

    // 1. Gather all potential docking targets:
    // Standalone cubes (not inside any cluster, visible, not dragged itself)
    const candidates = [];
    this.widgets.forEach(w => {
      if (w !== dragged && !w.cluster && w.element && w.element.style.display !== 'none') {
        candidates.push(w);
      }
    });

    // Existing active clusters (not dragged itself and not containing dragged)
    this.clusters.forEach(c => {
      if (c !== dragged && (!dragged.cluster || dragged.cluster !== c)) {
        candidates.push(c);
      }
    });

    for (const other of candidates) {
      const oRect = other.getBounds();

      // Check vertical overlap for horizontal snap (left / right)
      const hasVerticalOverlap = (dRect.bottom > oRect.top + 30) && (dRect.top < oRect.bottom - 30);

      // Check horizontal overlap for vertical snap (above / below)
      const hasHorizontalOverlap = (dRect.right > oRect.left + 30) && (dRect.left < oRect.right - 30);

      // 1. Vertical snap: Dragged ABOVE other (attaching to other's top edge)
      const dBottomToOTop = Math.abs(dRect.bottom - oRect.top);
      if (hasHorizontalOverlap && dBottomToOTop < minDistance) {
        closest = {
          target: other,
          dragged: dragged,
          orientation: 'vertical',
          position: 'before',
          targetX: oRect.left,
          targetY: oRect.top - dRect.height
        };
        minDistance = dBottomToOTop;
      }

      // 2. Vertical snap: Dragged BELOW other (attaching to other's bottom edge)
      const dTopToOBottom = Math.abs(dRect.top - oRect.bottom);
      if (hasHorizontalOverlap && dTopToOBottom < minDistance) {
        closest = {
          target: other,
          dragged: dragged,
          orientation: 'vertical',
          position: 'after',
          targetX: oRect.left,
          targetY: oRect.bottom
        };
        minDistance = dTopToOBottom;
      }

      // 3. Horizontal snap: Dragged to RIGHT of other
      const dLeftToORight = Math.abs(dRect.left - oRect.right);
      if (hasVerticalOverlap && dLeftToORight < minDistance) {
        closest = {
          target: other,
          dragged: dragged,
          orientation: 'horizontal',
          position: 'after',
          targetX: oRect.right,
          targetY: oRect.top
        };
        minDistance = dLeftToORight;
      }

      // 4. Horizontal snap: Dragged to LEFT of other
      const dRightToOLeft = Math.abs(dRect.right - oRect.left);
      if (hasVerticalOverlap && dRightToOLeft < minDistance) {
        closest = {
          target: other,
          dragged: dragged,
          orientation: 'horizontal',
          position: 'before',
          targetX: oRect.left - dRect.width,
          targetY: oRect.top
        };
        minDistance = dRightToOLeft;
      }
    }

    if (closest) {
      this.snapCandidate = closest;
      this.showSnapFeedback(closest);
    } else {
      this.snapCandidate = null;
      this.clearSnapFeedback();
    }
  }

  showSnapFeedback(candidate) {
    const { target, dragged, orientation, position } = candidate;
    const tRect = target.getBounds();
    const dRect = dragged.getBounds();

    if (target.isCube) {
      if (orientation === 'horizontal') {
        target.setPinActive(position === 'after' ? 'east' : 'west', true);
      } else {
        target.setPinActive(position === 'after' ? 'south' : 'north', true);
      }
    }

    if (dragged.isCube) {
      if (orientation === 'horizontal') {
        dragged.setPinActive(position === 'after' ? 'west' : 'east', true);
      } else {
        dragged.setPinActive(position === 'after' ? 'north' : 'south', true);
      }
    }

    if (orientation === 'horizontal') {
      const left = position === 'after' ? tRect.left : (tRect.left - dRect.width);
      this.snapGuide.className = 'snap-guide horizontal';
      this.snapGuide.style.left = `${left}px`;
      this.snapGuide.style.top = `${tRect.top}px`;
      this.snapGuide.style.width = `${tRect.width + dRect.width}px`;
      this.snapGuide.style.height = `${Math.max(tRect.height, dRect.height)}px`;
    } else {
      const top = position === 'after' ? tRect.top : (tRect.top - dRect.height);
      this.snapGuide.className = 'snap-guide vertical';
      this.snapGuide.style.left = `${tRect.left}px`;
      this.snapGuide.style.top = `${top}px`;
      this.snapGuide.style.width = `${Math.max(tRect.width, dRect.width)}px`;
      this.snapGuide.style.height = `${tRect.height + dRect.height}px`;
    }
  }

  clearSnapFeedback() {
    this.snapGuide.className = 'snap-guide hidden';
  }

  clearPins() {
    this.widgets.forEach(w => {
      if (typeof w.resetPins === 'function') w.resetPins();
    });
  }

  fuseEntities(target, dragged, orientation = 'horizontal', position = 'after') {
    // 1. Both are standalone cubes: create new cluster
    if (target.isCube && dragged.isCube) {
      const list = position === 'before' ? [dragged, target] : [target, dragged];
      const cluster = new WidgetCluster(list, orientation, this);
      this.clusters.push(cluster);
      this.workspace.appendChild(cluster.element);

      // Anchor cluster cleanly to target's position so target stays pinned
      let startX = target.x;
      let startY = target.y;
      if (orientation === 'vertical') {
        if (position === 'before') {
          startY = target.y - (dragged.height || 200);
        }
      } else {
        if (position === 'before') {
          startX = target.x - (dragged.width || 200);
        }
      }
      cluster.setPosition(startX, startY);

      if (this.onConnectionChange) {
        this.onConnectionChange({ type: 'connect', widgets: list, cluster });
      }
      if (this.onLayoutChanged) this.onLayoutChanged();
      return;
    }

    // 2. Target is cluster, dragged is cube
    if (!target.isCube && dragged.isCube) {
      target.addWidget(dragged, position, orientation);
      if (this.onConnectionChange) {
        this.onConnectionChange({ type: 'expand_cluster', widget: dragged, cluster: target });
      }
      if (this.onLayoutChanged) this.onLayoutChanged();
      return;
    }

    // 3. Target is cube, dragged is cluster
    if (target.isCube && !dragged.isCube) {
      dragged.addWidget(target, position === 'before' ? 'after' : 'before', orientation);
      if (this.onConnectionChange) {
        this.onConnectionChange({ type: 'expand_cluster', widget: target, cluster: dragged });
      }
      if (this.onLayoutChanged) this.onLayoutChanged();
      return;
    }

    // 4. Both are clusters: merge them into target
    if (!target.isCube && !dragged.isCube) {
      target.mergeWith(dragged, orientation);
      if (this.onConnectionChange) {
        this.onConnectionChange({ type: 'merge_clusters', cluster: target });
      }
      if (this.onLayoutChanged) this.onLayoutChanged();
      return;
    }
  }

  fuseWidgets(w1, w2, orientation = 'horizontal') {
    return this.fuseEntities(w1, w2, orientation, 'after');
  }

  uncoupleCluster(cluster) {
    if (!cluster) return;
    cluster.uncoupleAll();
  }
}

/**
 * Autonomous Modular Widget Cube (200x200 default, fully resizable & morphable)
 */
export class WidgetCube {
  constructor(id, title, badge, contentHtml, isCustom = false) {
    this.id = id;
    this.title = title;
    this.badge = badge;
    this.contentHtml = contentHtml;
    this.isCustom = isCustom;

    this.x = 0;
    this.y = 0;
    this.width = 200;
    this.height = 200;
    this.isLocked = false;

    this.engine = null;
    this.cluster = null;
    this.isCube = true;

    this.pins = {};
    this.createElement();
  }

  setEngine(engine) {
    this.engine = engine;
  }

  createElement() {
    const div = document.createElement('div');
    div.className = 'widget-cube';
    div.dataset.id = this.id;
    div.title = this.title;
    div.style.width = `${this.width}px`;
    div.style.height = `${this.height}px`;

    // Sleek floating hover action pill (Minimalist HUD - Zero clutter)
    const hoverActions = document.createElement('div');
    hoverActions.className = 'cube-hover-actions';
    hoverActions.innerHTML = `
      <button class="cube-action-btn shape-cube-btn" title="Alternar Formato (1:1, 16:9, 9:16, 2:1)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>
      <button class="cube-action-btn edit-cube-btn" title="Personalizar / Configurar">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
      <button class="cube-action-btn del-cube-btn" title="Ocultar de Pantalla">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    const body = document.createElement('div');
    body.className = `${this.id}-wrapper cube-body-container`;
    body.innerHTML = this.contentHtml;

    div.appendChild(body);
    div.appendChild(hoverActions);

    // Corner Resize & Deform Handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'cube-resize-handle';
    resizeHandle.title = 'Arrastra para redimensionar libremente';
    div.appendChild(resizeHandle);

    resizeHandle.addEventListener('pointerdown', (e) => {
      if (this.engine) this.engine.startResize(this, e);
    });

    // 4 Magnetic Connector Pins
    ['north', 'south', 'east', 'west'].forEach(dir => {
      const pin = document.createElement('div');
      pin.className = `connector-pin ${dir}`;
      div.appendChild(pin);
      this.pins[dir] = pin;
    });

    // Hover Action Listeners
    const shapeBtn = hoverActions.querySelector('.shape-cube-btn');
    shapeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleNextShape();
    });

    hoverActions.querySelector('.edit-cube-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.promptEdit();
    });

    hoverActions.querySelector('.del-cube-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`¿Deseas ocultar el cubo "${this.title}" de tu pantalla?`)) {
        if (this.engine) this.engine.removeWidget(this);
      }
    });

    // Start Drag on PointerDown
    div.addEventListener('pointerdown', (e) => {
      // Allow interactions with interactive child elements
      if (e.target.closest('button, input, textarea, canvas, label, select, iframe, .unlink-btn, .cube-action-btn, .cube-resize-handle')) return;
      if (this.cluster) return;
      if (this.engine) {
        this.engine.startDrag(this, e);
      }
    });

    // Glassmorphism Context Menu on Right-Click
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.openWidgetContextMenu === 'function') {
        window.openWidgetContextMenu(this, e.clientX, e.clientY);
      }
    });

    this.element = div;
  }

  setLocked(locked, triggerUpdate = true) {
    this.isLocked = locked;
    this.element.classList.toggle('is-locked', locked);
    if (triggerUpdate && this.engine && this.engine.onLayoutChanged) {
      this.engine.onLayoutChanged();
    }
  }

  setDimensions(w, h) {
    this.width = Math.round(w);
    this.height = Math.round(h);
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;

    // Dynamic responsive shape classes for Bento grid styling
    this.element.classList.toggle('is-widescreen', this.width >= 280);
    this.element.classList.toggle('is-vertical-banner', this.height >= 280);
    this.element.classList.toggle('is-compact', this.width <= 210 && this.height <= 210);

    // Reposition pins
    if (this.pins.east) this.pins.east.style.top = `${this.height / 2 - 4.5}px`;
    if (this.pins.west) this.pins.west.style.top = `${this.height / 2 - 4.5}px`;
    if (this.pins.north) this.pins.north.style.left = `${this.width / 2 - 4.5}px`;
    if (this.pins.south) this.pins.south.style.left = `${this.width / 2 - 4.5}px`;
  }

  updateTitle(newTitle, newBadge) {
    if (newTitle) this.title = newTitle;
    if (newBadge) this.badge = newBadge;
    if (this.element) {
      const titleEl = this.element.querySelector('.widget-title') || this.element.querySelector(`#title-${this.id}`);
      const badgeEl = this.element.querySelector('.widget-badge') || this.element.querySelector(`#badge-${this.id}`);
      if (titleEl) titleEl.textContent = this.title;
      if (badgeEl) badgeEl.textContent = this.badge;
    }
  }

  setShape(shapeStr) {
    if (shapeStr === '16:9') this.setDimensions(340, 200);
    else if (shapeStr === '9:16') this.setDimensions(200, 340);
    else if (shapeStr === '2:1') this.setDimensions(400, 200);
    else this.setDimensions(200, 200);
    this.triggerPop();
    if (this.engine && this.engine.onLayoutChanged) {
      this.engine.onLayoutChanged();
    }
  }

  cycleNextShape() {
    // Cycles: 200x200 (1:1) -> 340x200 (16:9 Widescreen) -> 200x340 (Vertical Banner) -> 400x200 (Panoramic) -> 200x200
    if (this.width === 200 && this.height === 200) {
      this.setDimensions(340, 200);
    } else if (this.width === 340 && this.height === 200) {
      this.setDimensions(200, 340);
    } else if (this.width === 200 && this.height === 340) {
      this.setDimensions(400, 200);
    } else {
      this.setDimensions(200, 200);
    }
    this.triggerPop();
    if (this.engine && this.engine.onLayoutChanged) {
      this.engine.onLayoutChanged();
    }
  }

  promptEdit() {
    if (typeof window !== 'undefined' && typeof window.openCubeInspector === 'function') {
      window.openCubeInspector(this);
      return;
    }
    if (typeof window !== 'undefined' && typeof window.showGlassPrompt === 'function') {
      window.showGlassPrompt({
        title: 'Renombrar Cubo',
        placeholder: 'Título...',
        value: this.title,
        onConfirm: (val) => {
          if (val && val.trim()) {
            this.updateTitle(val.trim());
            if (this.engine && this.engine.onLayoutChanged) this.engine.onLayoutChanged();
          }
        }
      });
    }
  }

  setPosition(x, y) {
    const margin = 16;
    const bottomMargin = 28;
    const screenW = window.innerWidth || 1920;
    const screenH = window.innerHeight || 1080;
    const maxLeft = Math.max(margin, screenW - this.width - margin);
    const maxTop = Math.max(margin, screenH - this.height - bottomMargin);

    this.x = Math.max(margin, Math.min(maxLeft, Math.round(x)));
    this.y = Math.max(margin, Math.min(maxTop, Math.round(y)));
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
  }

  getBounds() {
    return {
      left: this.x,
      top: this.y,
      right: this.x + this.width,
      bottom: this.y + this.height
    };
  }

  setPinActive(dir, active) {
    if (this.pins[dir]) {
      this.pins[dir].classList.toggle('active', active);
    }
  }

  resetPins() {
    Object.values(this.pins).forEach(p => p.classList.remove('active'));
  }

  triggerPop() {
    this.element.animate([
      { transform: 'scale(0.94)' },
      { transform: 'scale(1.05)' },
      { transform: 'scale(1)' }
    ], {
      duration: 320,
      easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    });
  }
}

/**
 * Fused Rectangular Bento Cluster (Supports N widgets seamlessly: 2, 3, 4, 5... all)
 */
export class WidgetCluster {
  constructor(widgets, orientation = 'horizontal', engine) {
    this.widgets = Array.isArray(widgets) ? [...widgets] : [widgets];
    this.orientation = orientation; // 'horizontal' | 'vertical' | 'grid'
    this.engine = engine;
    this.isCube = false;
    this.isLocked = false;

    this.x = 0;
    this.y = 0;
    this.width = 200;
    this.height = 200;

    this.widgets.forEach(w => {
      w.cluster = this;
    });

    this.createElement();
    this.updateGeometry();
  }

  get w1() {
    return this.widgets[0] || null;
  }

  get w2() {
    return this.widgets[1] || null;
  }

  getBounds() {
    return {
      left: this.x,
      top: this.y,
      right: this.x + this.width,
      bottom: this.y + this.height,
      width: this.width,
      height: this.height
    };
  }

  updateGeometry() {
    if (this.orientation === 'horizontal') {
      this.width = this.widgets.reduce((sum, w) => sum + (w.width || 200), 0);
      this.height = Math.max(...this.widgets.map(w => w.height || 200), 200);
    } else if (this.orientation === 'vertical') {
      this.width = Math.max(...this.widgets.map(w => w.width || 200), 200);
      this.height = this.widgets.reduce((sum, w) => sum + (w.height || 200), 0);
    } else {
      // 2-Column Grid
      this.width = 400;
      this.height = Math.ceil(this.widgets.length / 2) * 200;
    }

    if (this.element) {
      this.element.style.width = `${this.width}px`;
      this.element.style.height = `${this.height}px`;
    }
  }

  createElement() {
    const div = document.createElement('div');
    div.className = `widget-cluster ${this.orientation}`;
    this.element = div;

    this.rebuildDom();

    div.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, textarea, canvas, label, select, iframe, .unlink-btn, .cube-action-btn, .cube-resize-handle')) return;
      this.engine.startDrag(this, e);
    });

    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const first = this.widgets[0];
      if (first && typeof window.openWidgetContextMenu === 'function') {
        window.openWidgetContextMenu(first, e.clientX, e.clientY);
      }
    });

    div.animate([
      { transform: 'scale(0.96)', opacity: 0.8 },
      { transform: 'scale(1)', opacity: 1 }
    ], {
      duration: 280,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
    });
  }

  rebuildDom() {
    if (!this.element) return;
    this.element.innerHTML = '';
    this.element.className = `widget-cluster ${this.orientation}`;

    let cumulativeOffset = 0;

    this.widgets.forEach((w, idx) => {
      this.element.appendChild(w.element);

      // Add a seamless divider decoupling button between adjacent cubes
      if (idx < this.widgets.length - 1) {
        const seam = document.createElement('div');
        seam.className = 'unlink-seam';
        seam.dataset.seamIdx = idx;

        cumulativeOffset += (this.orientation === 'horizontal' ? (w.width || 200) : (w.height || 200));

        if (this.orientation === 'horizontal') {
          seam.style.left = `${cumulativeOffset - 12}px`;
          seam.style.top = '0';
          seam.style.bottom = '0';
          seam.style.width = '24px';
        } else {
          seam.style.top = `${cumulativeOffset - 12}px`;
          seam.style.left = '0';
          seam.style.right = '0';
          seam.style.height = '24px';
        }

        const unlinkBtn = document.createElement('button');
        unlinkBtn.className = 'unlink-btn';
        unlinkBtn.title = 'Desacoplar este cubo del grupo Bento';
        unlinkBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18.84 12.25 1.72-1.71a4.5 4.5 0 0 0-6.36-6.36l-1.72 1.71"/><path d="m5.16 11.75-1.72 1.71a4.5 4.5 0 0 0 6.36 6.36l1.72-1.71"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="16" y1="19" x2="16" y2="22"/><line x1="19" y1="16" x2="22" y2="16"/></svg>`;

        unlinkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.unlinkAt(idx);
        });

        seam.appendChild(unlinkBtn);
        this.element.appendChild(seam);
      }
    });
  }

  addWidget(cube, position = 'end', snapOrientation = null) {
    if (this.widgets.includes(cube)) return;

    // Multi-directional & Bento morphing:
    // If snapping in a different direction (e.g. vertical on a horizontal cluster or vice-versa),
    // morph seamlessly into a 2D Bento grid!
    if (snapOrientation && snapOrientation !== this.orientation) {
      this.orientation = 'grid';
    }

    cube.cluster = this;
    if (cube.element.parentElement) {
      cube.element.parentElement.removeChild(cube.element);
    }

    if (position === 'before' || position === 'start') {
      this.widgets.unshift(cube);
    } else {
      this.widgets.push(cube);
    }

    this.updateGeometry();
    this.rebuildDom();
    this.setPosition(this.x, this.y);
    cube.triggerPop();
  }

  removeWidget(cube) {
    const idx = this.widgets.indexOf(cube);
    if (idx === -1) return;

    this.widgets.splice(idx, 1);
    cube.cluster = null;
    this.engine.workspace.appendChild(cube.element);
    cube.setPosition(this.x + this.width + 25, this.y);
    cube.triggerPop();

    if (this.widgets.length <= 1) {
      if (this.widgets.length === 1) {
        const last = this.widgets[0];
        last.cluster = null;
        this.engine.workspace.appendChild(last.element);
        last.setPosition(this.x, this.y);
        last.triggerPop();
      }
      this.destroy();
    } else {
      this.updateGeometry();
      this.rebuildDom();
      this.setPosition(this.x, this.y);
    }
  }

  unlinkAt(seamIdx) {
    if (seamIdx < 0 || seamIdx >= this.widgets.length - 1) return;
    // Decouple the widget right at seamIdx + 1
    const targetCube = this.widgets[seamIdx + 1];
    if (targetCube) {
      this.removeWidget(targetCube);
    }
  }

  uncoupleAll() {
    const startX = this.x;
    const startY = this.y;
    const orientation = this.orientation;

    let offset = 0;
    const list = [...this.widgets];

    list.forEach(w => {
      w.cluster = null;
      this.engine.workspace.appendChild(w.element);
      if (orientation === 'horizontal') {
        w.setPosition(startX + offset, startY);
        offset += (w.width || 200) + 20;
      } else {
        w.setPosition(startX, startY + offset);
        offset += (w.height || 200) + 20;
      }
      w.triggerPop();
    });

    this.destroy();
  }

  cycleOrientation() {
    if (this.orientation === 'horizontal') this.orientation = 'vertical';
    else if (this.orientation === 'vertical') this.orientation = 'grid';
    else this.orientation = 'horizontal';

    this.updateGeometry();
    this.rebuildDom();
    this.setPosition(this.x, this.y);
    if (this.engine && this.engine.onLayoutChanged) this.engine.onLayoutChanged();
  }

  mergeWith(otherCluster, snapOrientation = null) {
    if (otherCluster === this) return;

    if (snapOrientation && snapOrientation !== this.orientation) {
      this.orientation = 'grid';
    }

    const incoming = [...otherCluster.widgets];
    otherCluster.widgets = [];
    if (otherCluster.element && otherCluster.element.parentElement) {
      otherCluster.element.parentElement.removeChild(otherCluster.element);
    }
    this.engine.clusters = this.engine.clusters.filter(c => c !== otherCluster);

    incoming.forEach(w => {
      w.cluster = this;
      this.widgets.push(w);
    });

    this.updateGeometry();
    this.rebuildDom();
    this.setPosition(this.x, this.y);
  }

  destroy() {
    this.widgets.forEach(w => {
      w.cluster = null;
    });
    this.widgets = [];
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
    this.engine.clusters = this.engine.clusters.filter(c => c !== this);
  }

  setPosition(x, y) {
    const margin = 16;
    const bottomMargin = 28;
    const screenW = window.innerWidth || 1920;
    const screenH = window.innerHeight || 1080;
    const clusterW = this.width || 200;
    const clusterH = this.height || 200;
    const maxLeft = Math.max(margin, screenW - clusterW - margin);
    const maxTop = Math.max(margin, screenH - clusterH - bottomMargin);

    this.x = Math.max(margin, Math.min(maxLeft, Math.round(x)));
    this.y = Math.max(margin, Math.min(maxTop, Math.round(y)));
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;

    let curX = this.x;
    let curY = this.y;
    this.widgets.forEach((w, idx) => {
      if (this.orientation === 'horizontal') {
        w.x = curX;
        w.y = curY;
        curX += (w.width || 200);
      } else if (this.orientation === 'vertical') {
        w.x = curX;
        w.y = curY;
        curY += (w.height || 200);
      } else {
        // Bento 2-column grid
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        w.x = this.x + col * (w.width || 200);
        w.y = this.y + row * (w.height || 200);
      }
    });
  }
}
