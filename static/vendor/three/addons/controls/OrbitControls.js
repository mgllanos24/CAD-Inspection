/**
 * Simplified OrbitControls adapted from three.js examples.
 * Provides orbiting, dollying and panning for a camera around a target.
 */

import {
    EventDispatcher,
    MOUSE,
    TOUCH,
    Quaternion,
    Vector2,
    Vector3,
    Spherical,
    MathUtils
} from 'three';

const _changeEvent = { type: 'change' };
const _startEvent = { type: 'start' };
const _endEvent = { type: 'end' };

const STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_PAN: 4,
    TOUCH_DOLLY_PAN: 5,
    TOUCH_DOLLY_ROTATE: 6
};

class OrbitControls extends EventDispatcher {

    constructor(object, domElement = document) {
        super();

        this.object = object;
        this.domElement = domElement;

        // API
        this.enabled = true;
        this.target = new Vector3();

        this.minDistance = 0;
        this.maxDistance = Infinity;

        this.minZoom = 0;
        this.maxZoom = Infinity;

        this.minPolarAngle = 0; // radians
        this.maxPolarAngle = Math.PI; // radians

        this.minAzimuthAngle = -Infinity; // radians
        this.maxAzimuthAngle = Infinity; // radians

        this.enableDamping = false;
        this.dampingFactor = 0.05;

        this.enableZoom = true;
        this.zoomSpeed = 1.0;

        this.enableRotate = true;
        this.rotateSpeed = 1.0;

        this.enablePan = true;
        this.panSpeed = 1.0;
        this.screenSpacePanning = true;
        this.keyPanSpeed = 7.0; // pixels per arrow key

        this.autoRotate = false;
        this.autoRotateSpeed = 2.0; // 30s per round when fps=60

        this.enableKeys = true;
        this.keys = { LEFT: 'ArrowLeft', UP: 'ArrowUp', RIGHT: 'ArrowRight', BOTTOM: 'ArrowDown' };

        this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
        this.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

        // internals
        this.target0 = this.target.clone();
        this.position0 = this.object.position.clone();
        this.zoom0 = this.object.zoom;

        const scope = this;
        let state = STATE.NONE;
        const EPS = 1e-6;

        const spherical = new Spherical();
        const sphericalDelta = new Spherical();
        let scale = 1;
        const panOffset = new Vector3();
        let zoomChanged = false;

        const rotateStart = new Vector2();
        const rotateEnd = new Vector2();
        const rotateDelta = new Vector2();

        const panStart = new Vector2();
        const panEnd = new Vector2();
        const panDelta = new Vector2();

        const dollyStart = new Vector2();
        const dollyEnd = new Vector2();
        const dollyDelta = new Vector2();

        function getAutoRotationAngle() {
            return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
        }

        function getZoomScale() {
            return Math.pow(0.95, scope.zoomSpeed);
        }

        function rotateLeft(angle) {
            sphericalDelta.theta -= angle;
        }

        function rotateUp(angle) {
            sphericalDelta.phi -= angle;
        }

        const panLeft = (function () {
            const v = new Vector3();
            return function panLeft(distance, objectMatrix) {
                v.setFromMatrixColumn(objectMatrix, 0);
                v.multiplyScalar(-distance);
                panOffset.add(v);
            };
        })();

        const panUp = (function () {
            const v = new Vector3();
            return function panUp(distance, objectMatrix) {
                if (scope.screenSpacePanning) {
                    v.setFromMatrixColumn(objectMatrix, 1);
                } else {
                    v.setFromMatrixColumn(objectMatrix, 0);
                    v.crossVectors(scope.object.up, v);
                }
                v.multiplyScalar(distance);
                panOffset.add(v);
            };
        })();

        const pan = (deltaX, deltaY) => {
            const element = scope.domElement;
            if (scope.object.isPerspectiveCamera) {
                const position = scope.object.position;
                const offset = new Vector3();
                offset.copy(position).sub(scope.target);
                let targetDistance = offset.length();
                targetDistance *= Math.tan(scope.object.fov / 2 * Math.PI / 180.0);
                panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix);
                panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix);
            } else if (scope.object.isOrthographicCamera) {
                panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
                panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);
            } else {
                scope.enablePan = false;
            }
        };

        function dollyOut(dollyScale) {
            if (scope.object.isPerspectiveCamera) {
                scale /= dollyScale;
            } else if (scope.object.isOrthographicCamera) {
                scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
                scope.object.updateProjectionMatrix();
                zoomChanged = true;
            } else {
                scope.enableZoom = false;
            }
        }

        function dollyIn(dollyScale) {
            if (scope.object.isPerspectiveCamera) {
                scale *= dollyScale;
            } else if (scope.object.isOrthographicCamera) {
                scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
                scope.object.updateProjectionMatrix();
                zoomChanged = true;
            } else {
                scope.enableZoom = false;
            }
        }

        // event handlers -------------------------------------------------------

        function handleMouseDownRotate(event) {
            rotateStart.set(event.clientX, event.clientY);
        }

        function handleMouseDownPan(event) {
            panStart.set(event.clientX, event.clientY);
        }

        function handleMouseDownDolly(event) {
            dollyStart.set(event.clientX, event.clientY);
        }

        function handleMouseMoveRotate(event) {
            rotateEnd.set(event.clientX, event.clientY);
            rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
            const element = scope.domElement;
            rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight);
            rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
            rotateStart.copy(rotateEnd);
            scope.update();
        }

        function handleMouseMovePan(event) {
            panEnd.set(event.clientX, event.clientY);
            panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
            pan(panDelta.x, panDelta.y);
            panStart.copy(panEnd);
            scope.update();
        }

        function handleMouseMoveDolly(event) {
            dollyEnd.set(event.clientX, event.clientY);
            dollyDelta.subVectors(dollyEnd, dollyStart);
            if (dollyDelta.y > 0) {
                dollyOut(getZoomScale());
            } else if (dollyDelta.y < 0) {
                dollyIn(getZoomScale());
            }
            dollyStart.copy(dollyEnd);
            scope.update();
        }

        function handleMouseWheel(event) {
            if (event.deltaY < 0) {
                dollyIn(getZoomScale());
            } else if (event.deltaY > 0) {
                dollyOut(getZoomScale());
            }
            scope.update();
        }

        function onPointerDown(event) {
            if (scope.enabled === false) return;
            switch (event.button) {
                case 0:
                    if (!scope.enableRotate) return;
                    handleMouseDownRotate(event);
                    state = STATE.ROTATE;
                    break;
                case 1:
                    if (!scope.enableZoom) return;
                    handleMouseDownDolly(event);
                    state = STATE.DOLLY;
                    break;
                case 2:
                    if (!scope.enablePan) return;
                    handleMouseDownPan(event);
                    state = STATE.PAN;
                    break;
            }
            if (state !== STATE.NONE) scope.domElement.setPointerCapture(event.pointerId);
            scope.dispatchEvent(_startEvent);
        }

        function onPointerMove(event) {
            if (scope.enabled === false) return;
            if (state === STATE.ROTATE) {
                if (!scope.enableRotate) return;
                handleMouseMoveRotate(event);
            } else if (state === STATE.DOLLY) {
                if (!scope.enableZoom) return;
                handleMouseMoveDolly(event);
            } else if (state === STATE.PAN) {
                if (!scope.enablePan) return;
                handleMouseMovePan(event);
            }
        }

        function onPointerUp(event) {
            if (scope.enabled === false) return;
            scope.domElement.releasePointerCapture(event.pointerId);
            state = STATE.NONE;
            scope.dispatchEvent(_endEvent);
        }

        function onWheel(event) {
            if (scope.enabled === false || !scope.enableZoom || state !== STATE.NONE) return;
            event.preventDefault();
            handleMouseWheel(event);
        }

        function handleKeyDown(event) {
            if (!scope.enableKeys || !scope.enablePan) return;
            switch (event.code) {
                case scope.keys.UP:
                    pan(0, scope.keyPanSpeed);
                    scope.update();
                    break;
                case scope.keys.BOTTOM:
                    pan(0, -scope.keyPanSpeed);
                    scope.update();
                    break;
                case scope.keys.LEFT:
                    pan(scope.keyPanSpeed, 0);
                    scope.update();
                    break;
                case scope.keys.RIGHT:
                    pan(-scope.keyPanSpeed, 0);
                    scope.update();
                    break;
            }
        }

        function handleTouchStartRotate(event) {
            rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
        }

        function handleTouchStartPan(event) {
            panStart.set(event.touches[0].pageX, event.touches[0].pageY);
        }

        function handleTouchStartDollyPan(event) {
            const dx = event.touches[0].pageX - event.touches[1].pageX;
            const dy = event.touches[0].pageY - event.touches[1].pageY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            dollyStart.set(0, distance);
            const x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
            const y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
            panStart.set(x, y);
        }

        function handleTouchMoveRotate(event) {
            rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
            rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
            const element = scope.domElement;
            rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight);
            rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
            rotateStart.copy(rotateEnd);
            scope.update();
        }

        function handleTouchMovePan(event) {
            panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
            panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
            pan(panDelta.x, panDelta.y);
            panStart.copy(panEnd);
            scope.update();
        }

        function handleTouchMoveDollyPan(event) {
            const dx = event.touches[0].pageX - event.touches[1].pageX;
            const dy = event.touches[0].pageY - event.touches[1].pageY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            dollyEnd.set(0, distance);
            dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, 1));
            if (dollyDelta.y > 1) {
                dollyOut(dollyDelta.y);
            } else if (dollyDelta.y < 1) {
                dollyIn(1 / dollyDelta.y);
            }
            dollyStart.copy(dollyEnd);
            const x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
            const y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
            panEnd.set(x, y);
            panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
            pan(panDelta.x, panDelta.y);
            panStart.copy(panEnd);
            scope.update();
        }

        function onTouchStart(event) {
            if (scope.enabled === false) return;
            switch (event.touches.length) {
                case 1:
                    if (!scope.enableRotate) return;
                    state = STATE.TOUCH_ROTATE;
                    handleTouchStartRotate(event);
                    break;
                case 2:
                    if (!scope.enableZoom && !scope.enablePan) return;
                    state = STATE.TOUCH_DOLLY_PAN;
                    handleTouchStartDollyPan(event);
                    break;
            }
            scope.dispatchEvent(_startEvent);
        }

        function onTouchMove(event) {
            if (scope.enabled === false) return;
            switch (state) {
                case STATE.TOUCH_ROTATE:
                    if (!scope.enableRotate) return;
                    handleTouchMoveRotate(event);
                    break;
                case STATE.TOUCH_PAN:
                    if (!scope.enablePan) return;
                    handleTouchMovePan(event);
                    break;
                case STATE.TOUCH_DOLLY_PAN:
                    if (!scope.enableZoom && !scope.enablePan) return;
                    handleTouchMoveDollyPan(event);
                    break;
            }
        }

        function onTouchEnd() {
            if (scope.enabled === false) return;
            state = STATE.NONE;
            scope.dispatchEvent(_endEvent);
        }

        function onContextMenu(event) {
            if (!scope.enabled) return;
            event.preventDefault();
        }

        // public methods -------------------------------------------------------

        this.getPolarAngle = function () {
            return spherical.phi;
        };

        this.getAzimuthalAngle = function () {
            return spherical.theta;
        };

        this.getDistance = function () {
            return this.object.position.distanceTo(this.target);
        };

        this.listenToKeyEvents = function (domElement) {
            domElement.addEventListener('keydown', handleKeyDown);
            this._domElementKeyEvents = domElement;
        };

        this.saveState = function () {
            scope.target0.copy(scope.target);
            scope.position0.copy(scope.object.position);
            scope.zoom0 = scope.object.zoom;
        };

        this.reset = function () {
            scope.target.copy(scope.target0);
            scope.object.position.copy(scope.position0);
            scope.object.zoom = scope.zoom0;
            scope.object.updateProjectionMatrix();
            scope.dispatchEvent(_changeEvent);
            scope.update();
            state = STATE.NONE;
        };

        this.update = function () {
            const offset = new Vector3();
            const quat = new Quaternion().setFromUnitVectors(scope.object.up, new Vector3(0, 1, 0));
            const quatInverse = quat.clone().invert();
            const lastPosition = new Vector3();
            const lastQuaternion = new Quaternion();

            return function update() {
                const position = scope.object.position;
                offset.copy(position).sub(scope.target);
                offset.applyQuaternion(quat);
                spherical.setFromVector3(offset);

                if (scope.autoRotate && state === STATE.NONE) {
                    rotateLeft(getAutoRotationAngle());
                }

                spherical.theta += sphericalDelta.theta;
                spherical.phi += sphericalDelta.phi;

                spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta));
                spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));
                spherical.makeSafe();

                spherical.radius *= scale;
                spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

                scope.target.add(panOffset);

                offset.setFromSpherical(spherical);
                offset.applyQuaternion(quatInverse);
                position.copy(scope.target).add(offset);

                scope.object.lookAt(scope.target);

                if (scope.enableDamping === true) {
                    sphericalDelta.theta *= 1 - scope.dampingFactor;
                    sphericalDelta.phi *= 1 - scope.dampingFactor;
                    panOffset.multiplyScalar(1 - scope.dampingFactor);
                } else {
                    sphericalDelta.set(0, 0, 0);
                    panOffset.set(0, 0, 0);
                }

                scale = 1;

                if (zoomChanged || lastPosition.distanceToSquared(scope.object.position) > EPS || 8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {
                    scope.dispatchEvent(_changeEvent);
                    lastPosition.copy(scope.object.position);
                    lastQuaternion.copy(scope.object.quaternion);
                    zoomChanged = false;
                }
            };
        }();

        this.dispose = function () {
            scope.domElement.removeEventListener('contextmenu', onContextMenu);
            scope.domElement.removeEventListener('pointerdown', onPointerDown);
            scope.domElement.removeEventListener('pointermove', onPointerMove);
            scope.domElement.removeEventListener('pointerup', onPointerUp);
            scope.domElement.removeEventListener('wheel', onWheel);
            scope.domElement.removeEventListener('touchstart', onTouchStart);
            scope.domElement.removeEventListener('touchmove', onTouchMove);
            scope.domElement.removeEventListener('touchend', onTouchEnd);
            if (scope._domElementKeyEvents) scope._domElementKeyEvents.removeEventListener('keydown', handleKeyDown);
        };

        scope.domElement.addEventListener('contextmenu', onContextMenu);
        scope.domElement.addEventListener('pointerdown', onPointerDown);
        scope.domElement.addEventListener('pointermove', onPointerMove);
        scope.domElement.addEventListener('pointerup', onPointerUp);
        scope.domElement.addEventListener('wheel', onWheel, { passive: false });
        scope.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
        scope.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
        scope.domElement.addEventListener('touchend', onTouchEnd);
    }
}

export { OrbitControls };
