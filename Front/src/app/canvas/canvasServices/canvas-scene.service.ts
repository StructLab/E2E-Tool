import { Injectable, ElementRef } from '@angular/core';
import * as THREE from 'three';
import { CanvasDragDropService } from './canvas-drag-drop.service';
import { AxesOverlayService } from './axes-overlay.service';
import { CameraControlService } from './camera-control.service';
import { CanvasPanService } from './canvas-pan.service';
import { SvgDropService } from '../../assets/assetsServices/svg-drop.service';
import { TracksService } from '../tracks.service';
import { ObjectDeleteService } from '../../assets/assetsServices/object-delete.service';
import { NotificationService } from '../../services/notification.service';
import { SwitchesDawingService } from './switches-drawing.service';
import { DrawingItem, SwitchItem } from '../../generic/canvas-item';
import { LoadItems } from '../../api/end_points';
import { SegmentProfileService } from '../../assets/assetsServices/segment-profile.service';

@Injectable({ providedIn: 'root' })
export class CanvasSceneService {
    scene!: THREE.Scene; /*the world containing all objects*/
    camera!: THREE.OrthographicCamera; /*camera = the user’s view of the canvas like zoom in zoom out*/
    private canvas!: HTMLCanvasElement; /*the real browser drawing surface*/
    private renderer!: THREE.WebGLRenderer; /*draw this scene from this camera’s view.*/

    private gridHelper!: THREE.GridHelper;
    private gridVisible = true;
    constructor(
        private dragDropService: CanvasDragDropService,
        private svgDropService: SvgDropService,
        private segmentProfileService: SegmentProfileService,
        private tracksService: TracksService,
        private axesOverlayService: AxesOverlayService,
        private cameraControlService: CameraControlService,
        private canvasPanService: CanvasPanService,
        private objectDeleteService: ObjectDeleteService,
        private notificationService: NotificationService,
    ) { }

    async init(width: number, height: number, canvasRef: ElementRef<HTMLCanvasElement>) {

        this.axesOverlayService.init();

        this.canvas = canvasRef.nativeElement;
        
        // --- Scene & Camera ---
        this.scene = new THREE.Scene();
        const aspect = width / height;
        const frustumSize = 200;
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            -1000,
            1000
        );
        this.camera.position.z = 300;
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
        // --- Renderer ---
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x0f1720, 1);
        this.cameraControlService.init(this.canvas, this.camera);
        // add grid 

        // --- Grid ---
        const gridSize = 200000; // 200 km
        const divisions = 200;   // 200 divisions

        this.gridHelper = new THREE.GridHelper(
        gridSize,
        divisions,
        0x263241,
        0x263241
        );

        this.gridHelper.rotation.x = Math.PI / 2;
        this.scene.add(this.gridHelper);

        this.notificationService.notifications$.subscribe((x) => {
        
            x.content?.forEach((d: DrawingItem) => {     
                let createInBackEnd = d.operation === "Plan" ? false : true;
                if (d.type !== "Switch" && d.type !== "SegmentProfile") this.svgDropService.dropSvg(d.x, d.y, d.rotation, `/svgs/${d.type}.svg`, this.scene, false, d.id);
                if (d.type === "SegmentProfile") this.segmentProfileService.SegmentProfileCreation(this.scene, d.id);
            });
        })
        //this.tracksService.createTracks(this.scene);
        //this.tracksService.drawSwitchs(this.scene);
        //await LoadItems("bufferStops", this.notificationService);
        

        this.notificationService.notify({
            type: "success",
            text: ``,
            content: [],
            operation: "plan"
        });
       
    }

    render(container: HTMLElement, animateCallback?: Function) {
        container.appendChild(this.renderer.domElement);
        const animate = () => {
            requestAnimationFrame(animate);
            if (animateCallback) animateCallback();
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }
    toggleGrid(): void {
    if (!this.gridHelper) return;

    this.gridVisible = !this.gridVisible;
    this.gridHelper.visible = this.gridVisible;
    }

    setGridVisible(visible: boolean): void {
    if (!this.gridHelper) return;

    this.gridVisible = visible;
    this.gridHelper.visible = visible;
    }

    isGridVisible(): boolean {
    return this.gridVisible;
    }

    async loadRailwayData(): Promise<void> {
      if (!this.scene) {
        console.warn('Scene is not ready yet');
        return;
      }

      console.log('Loading imported railway data...');
      await this.tracksService.cleanData(
        this.scene
      );
      await this.tracksService.createTracks(
        this.scene
      );


      await this.tracksService.drawSwitchs(
        this.scene
      );

      // Do not draw the hard-coded sample railway layout.
      // Real RINF/OSM geometry will be added to the scene separately.

      setTimeout(() => {
        this.fitCameraToScene();
      }, 100);
    }

    moveCameraByScroll(scrollX: number, scrollY: number): void {
    if (!this.camera) return;

    const scrollSpeed = 0.15;

    this.camera.position.x = scrollX * scrollSpeed;
    this.camera.position.y = -scrollY * scrollSpeed;

    this.camera.updateProjectionMatrix();

    }


    private resizeRendererToCanvas(): void {
      if (!this.canvas || !this.renderer || !this.camera) return;

      const container = this.canvas.parentElement;

      const width = container?.clientWidth ?? this.canvas.clientWidth;
      const height = container?.clientHeight ?? this.canvas.clientHeight;

      if (width <= 0 || height <= 0) return;

      // Update the actual WebGL drawing size
      this.renderer.setSize(width, height, false);

      // Update the orthographic camera aspect ratio
      const aspect = width / height;
      const frustumSize = 200;

      this.camera.left = -frustumSize * aspect / 2;
      this.camera.right = frustumSize * aspect / 2;
      this.camera.top = frustumSize / 2;
      this.camera.bottom = -frustumSize / 2;

      this.camera.updateProjectionMatrix();
    }

    fitCameraToScene(): void {
  if (!this.scene || !this.camera || !this.renderer) return;

  this.resizeRendererToCanvas();

  const box = new THREE.Box3();

  this.scene.traverse((object) => {
    // Skip grid because grid is huge and would ruin the fitting
    if (object === this.gridHelper) return;

    if ((object as THREE.Mesh).isMesh || object.type === 'Group' || object.type === 'Line') {
      const objectBox = new THREE.Box3().setFromObject(object);

      if (!objectBox.isEmpty()) {
        box.union(objectBox);
      }
    }
  });

  if (box.isEmpty()) {
    console.warn('No imported objects found to fit camera');
    return;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  box.getCenter(center);
  box.getSize(size);

  this.camera.position.x = center.x;
  this.camera.position.y = center.y;

  const canvas = this.renderer.domElement;
  const aspect = canvas.clientWidth / canvas.clientHeight;

  const frustumHeight = this.camera.top - this.camera.bottom;
  const frustumWidth = frustumHeight * aspect;

  const zoomX = frustumWidth / size.x;
  const zoomY = frustumHeight / size.y;

  const padding = 0.9;
  const newZoom = Math.min(zoomX, zoomY) * padding;

  this.camera.zoom = Math.max(0.001, Math.min(newZoom, 10));
  this.camera.updateProjectionMatrix();

  console.log('Camera fitted to imported layout:', {
    center,
    size,
    zoom: this.camera.zoom
  });
}

}