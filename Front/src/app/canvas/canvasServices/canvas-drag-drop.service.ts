import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { CanvasItem } from '../../generic/canvas-item';
import { NotificationService } from '../../services/notification.service';
import { ButtonStateService } from './button-state.service';
// import { AddSegmentProfile, AddTimingPoint } from '../../api/end_points';


@Injectable({ providedIn: 'root' })
export class CanvasDragDropService {
    private raycaster = new THREE.Raycaster(); /* detects what object the mouse is pointing at*/
    private pointer = new THREE.Vector2(); /* stores mouse position*/
    private draggedMesh: THREE.Mesh | THREE.Line | THREE.Group | null = null; /* stores the object currently being dragged*/
    private offset = new THREE.Vector3(); /*stores distance between mouse click point and object center*/

    constructor(private notificationService: NotificationService, private state: ButtonStateService) {

    }

    /**
     * Attach drag handlers to a canvas
     * @param canvas The canvas element
     * @param scene Three.js scene
     * @param camera Three.js camera
     */
    attach(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer) {

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        // // Geometry + Material
        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        let hoveredObject: THREE.Object3D | null = null;
        // // Mesh
        // const cube = new THREE.Mesh(geometry, material);
        // scene.add(cube);
        window.addEventListener('mousemove', (event) => {

            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObjects(scene.children, true);

            if (intersects.length > 0) {
                for (const hit of intersects) {

                    let obj = hit.object;

                    // 🔥 climb up until you reach the SVG Group
                    while (obj.parent && obj.parent.type !== 'Scene') {
                        obj = obj.parent;
                    }

                    // climb to group
                    while (obj.parent && obj.parent.type !== 'Scene') {
                        obj = obj.parent;
                    }

                    if (hoveredObject !== obj) {
                        hoveredObject = obj;

                        document.body.style.cursor = 'pointer'; // 👈 hover ON

                    }
                }




            } else {

                hoveredObject = null;
                document.body.style.cursor = 'default'; // 👈 hover OFF
            }
        });

        window.addEventListener('click', (event) => {


        });
        // Mouse down → start dragging
        canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event, scene, camera, renderer));

        // Mouse move → move dragged object
        canvas.addEventListener('pointermove', (event) => this.onPointerMove(event, camera));

        // Mouse up → release object
        canvas.addEventListener('pointerup', (event) => this.pointerup(event, scene, camera));
        canvas.addEventListener('pointerleave', () => (this.draggedMesh = null));
    }

    private pointerup(event: PointerEvent, scene: THREE.Scene, camera: THREE.OrthographicCamera) {
        if (!this.draggedMesh) return;

        console.log('Object moved locally:', this.draggedMesh.position);;

        this.draggedMesh = null;
        this.clearAllOutlines(scene);
    }

    private onPointerDown(event: PointerEvent, scene: THREE.Scene, camera: THREE.OrthographicCamera, renderer: THREE.WebGLRenderer) {
        const canvas = renderer.domElement;
        const rect = renderer.domElement.getBoundingClientRect();

        // Convert mouse to normalized device coordinates (-1 to +1)
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, camera);
        // Intersect objects in the scene
        const intersects = this.raycaster.intersectObjects(scene.children, true);

        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, camera);


        console.log('Clicked at:', this.pointer, 'Intersects:', intersects);
        for (const hit of intersects) {

            let obj = hit.object;

            // 🔥 climb up until you reach the SVG Group
            while (obj.parent && obj.parent.type !== 'Scene') {
                obj = obj.parent;
            }
            /*
            if (this.state.segmentProfileActive) {
                AddSegmentProfile(hit.point.x, hit.point.y, this.notificationService);
                this.notificationService.notify({
                    type: "success",
                    text: ``,
                    content: [],
                    operation: "telegram"
                });
            }
            */
            // 🔥 optional: ensure it's actually a Group
            if (obj instanceof THREE.Group) {

                console.log('Found group:', obj);

                // obj.traverse(child => {
                //     if (child instanceof THREE.Mesh) {
                //         const mat = child.material as THREE.MeshBasicMaterial;
                //         mat.color.set(0xff0000);
                //     }
                // });
                if (obj.userData["draggable"] === false || obj.userData["draggable"] === undefined) {
                    this.draggedMesh = null;
                    return;
                }
                if (obj.userData["type"] === "AxleCounter") {
                    console.log('Axle counter selected - adding red outline');
                    // Store offset between pointer intersection point and mesh position
                    //obj.position.copy(hit.point);
                    this.draggedMesh = obj;
                    this.offset.copy(intersects[0].point).sub(obj.position);
                }
                /*if (this.state.timingPointActive && obj.userData["type"] === "ETCSmarker") {

                    console.log('ETCS marker selected - adding blue outline');

                    //this.addSelectionOutline(this.draggedMesh as THREE.Mesh, 0x00FF00); // blue outline for ETCS markers
                    AddTimingPoint(obj.userData["id"], this.notificationService);

                    this.notificationService.notify({
                        type: "success",
                        text: ``,
                        content: [],
                        operation: "segmentProfile"
                    });

                    return;
                }*/
               
                if (obj.userData["type"] === "BaliseGroup") {

                    console.log('Balise group selected - adding green outline');

                    this.notificationService.notify({
                        type: "success",
                        text: ``,
                        content: [obj.userData["id"]],
                        operation: "create telegram"
                    });
                }
                break; // stop after first valid group hit
            }
        }
        // if (this.state.segmentProfileActive) {
        //     AddSegmentProfile(point.x, point.y, this.notificationService);
        //     this.notificationService.notify({
        //         type: "success",
        //         text: ``,
        //         content: [],
        //         operation: "segmentProfile"
        //     });
        // }

        // if (intersects.length > 0) {
        //     const selectedObject = intersects[0].object;
        //     this.draggedMesh = intersects[0].object as THREE.Mesh | THREE.Line;
        //     console.log(this.draggedMesh.userData["type"])
        //     if (this.state.timingPointActive && this.draggedMesh.userData["type"] === "ETCSmarker") {

        //         console.log('ETCS marker selected - adding blue outline');

        //         this.addSelectionOutline(this.draggedMesh as THREE.Mesh, 0x00FF00); // blue outline for ETCS markers
        //         AddTimingPoint(this.draggedMesh.userData["id"], this.notificationService);

        //         this.notificationService.notify({
        //             type: "success",
        //             text: ``,
        //             content: [],
        //             operation: "timingPoint"
        //         });

        //         return;
        //     }
        //     if (this.draggedMesh.userData["draggable"] === false || this.draggedMesh.userData["draggable"] === undefined) {
        //         this.draggedMesh = null;
        //         return;
        //     }

        //     if (this.draggedMesh.userData["type"] === "AxleCounter") {
        //         // Store offset between pointer intersection point and mesh position
        //         this.offset.copy(intersects[0].point).sub(this.draggedMesh.position);
        //     }

        //     if (this.draggedMesh.userData["type"] === "BaliseGroup") {
        //         console.log('Balise group selected - adding green outline');

        //         this.notificationService.notify({
        //             type: "success",
        //             text: ``,
        //             content: [],
        //             operation: "telegram"
        //         });
        //     }
        // }
    }
    private addSelectionOutline(mesh: THREE.Mesh, color: number = 0xff0000) {
        // Remove previous outline if exists
        if (mesh.userData["outline"]) {
            mesh.remove(mesh.userData["outline"]);
            mesh.userData["outline"] = null;
        }

        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: color })
        );

        mesh.add(line);
        mesh.userData["outline"] = line;
    }
    private onPointerMove(event: PointerEvent, camera: THREE.OrthographicCamera) {
        if (!this.draggedMesh) return;

        const canvas = event.target as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();

        // Update pointer coordinates
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, camera);

        // Intersect with a plane at Z=0
        const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(planeZ, intersectPoint);

        // Move mesh with offset
        this.draggedMesh.position.copy(intersectPoint.sub(this.offset));
    }
    private clearAllOutlines(scene: THREE.Scene) {
        if (!scene) return;

        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;

            if (mesh.userData && mesh.userData["outline"]) {
                const outline = mesh.userData["outline"];

                mesh.remove(outline);
                outline.geometry.dispose();
                outline.material.dispose();

                mesh.userData["outline"] = null;
            }
        });
    }
}
