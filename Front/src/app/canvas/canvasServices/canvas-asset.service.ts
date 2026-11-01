
import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { addIcon } from '../../generic/canvas-item';
import { NotificationService } from '../../services/notification.service';
import { CanvasSelectionService } from './canvas-selection';
import { IconScaleService } from './icon-scale.service';
import { AssetIdService } from './asset-id.service';
import { AssetLabelService } from './asset-label.service';

@Injectable({
  providedIn: 'root'
})
export class CanvasAssetService {

  constructor(
    private notificationService: NotificationService,
    private canvasSelectionService: CanvasSelectionService,
    private iconScaleService: IconScaleService,
    private assetIdService: AssetIdService,
    private assetLabelService: AssetLabelService
   ) {}

  addSvgToCanvas(
    scene: THREE.Scene,
    svgSrc: string,
    point: THREE.Vector3,
    onAssetAdded: (asset: THREE.Group) => void
  ): void {

    addIcon(
      scene,
      svgSrc,
      2,
      point,
      0,
      this.notificationService,
      (mesh: THREE.Group) => {

       
        const layerType = mesh.userData['type'];

        mesh.userData['layerType'] = layerType;
        mesh.userData['draggable'] = true;
        mesh.userData['type'] = 'DroppedAsset';

        // Generate a unique display ID
        const displayId = this.assetIdService.generateId(layerType);

        mesh.userData['displayId'] = displayId;

        // Register icon for global size adjustment
        this.iconScaleService.registerIcon(mesh);

        this.assetLabelService.addLabel(mesh, displayId);

        console.log(
        'ASSET CREATED:',
        layerType,
        'DISPLAY ID:',
        displayId
        );

        onAssetAdded(mesh);

        console.log(
          'ASSET ADDED:',
          mesh.userData['type'],
          'LAYER TYPE:',
          mesh.userData['layerType']
        );
      },
      true
    );
  }

  

duplicateAsset(
    selectedAsset: THREE.Object3D,
    scene: THREE.Scene
    ): THREE.Object3D {

    const original =
        this.canvasSelectionService.getDeletableRoot(
        selectedAsset,
        scene
        );

    // Determine the original asset type
    const assetType =
        original.userData['layerType'] ??
        original.userData['type'];

    // Clone the original icon
    const duplicate =
        this.canvasSelectionService.cloneObjectForCanvas(
        original
        );

    // Position the duplicate beside the original
    duplicate.position.x += 5;
    duplicate.position.y -= 5;

    // Preserve the original asset category
    duplicate.userData['layerType'] = assetType;
    duplicate.userData['type'] = 'DroppedAsset';

    // Give the duplicate a new internal identity
    duplicate.userData['id'] = crypto.randomUUID();
    duplicate.userData['draggable'] = true;

    // Remove references to the original CanvasItem
    this.canvasSelectionService.removeCanvasItemReferences(
        duplicate
    );

    // Remove any inherited label from the clone
    const oldLabels = duplicate.children.filter(
        child =>
        child.name === 'AssetIdLabel' ||
        child.userData['type'] === 'AssetIdLabel'
    );

    oldLabels.forEach(label => {
        duplicate.remove(label);
    });

    // Generate a new display ID
    const displayId =
        this.assetIdService.generateId(assetType);

    duplicate.userData['displayId'] = displayId;

    // Preserve the current icon scale as its base
    const originalBaseScale =
        original.userData['baseScale'] as
        THREE.Vector3 | undefined;

    const currentScale = this.iconScaleService.getScale();

    duplicate.userData['baseScale'] = originalBaseScale
        ? originalBaseScale.clone()
        : duplicate.scale.clone().divideScalar(currentScale);

    // Register the duplicate with the scale slider
    this.iconScaleService.registerIcon(duplicate);

    // Create the new visible ID label
    this.assetLabelService.addLabel(
        duplicate,
        displayId
    );

    // Add the duplicate to the scene
    scene.add(duplicate);

    console.log(
        'ASSET DUPLICATED:',
        original.userData['displayId'],
        '->',
        displayId
    );

    return duplicate;
    }


deleteAssets(
    assets: THREE.Object3D[],
    scene: THREE.Scene
    ): number {

    if (assets.length === 0) {
        return 0;
    }

    assets.forEach((asset) => {

        const objectToDelete =
        this.canvasSelectionService.getDeletableRoot(
            asset,
            scene
        );

        const canvasItem =
        objectToDelete.userData?.['canvasItem'];

        if (
        canvasItem &&
        typeof canvasItem.Delete === 'function'
        ) {
        canvasItem.Delete();
        }

        if (objectToDelete.parent) {
        objectToDelete.parent.remove(objectToDelete);
        } else {
        scene.remove(objectToDelete);
        }

        this.canvasSelectionService.disposeObject(
        objectToDelete
        );

    });

    console.log(
        'SELECTED ASSETS DELETED:',
        assets.length
    );

    return assets.length;
    }

    
mirrorAsset(
    selectedAsset: THREE.Object3D,
    scene: THREE.Scene,
    axis: 'horizontal' | 'vertical'
    ): THREE.Object3D {

    const objectToMirror =
        this.canvasSelectionService.getDeletableRoot(
        selectedAsset,
        scene
        );

    // Apply mirroring through CanvasSelectionService
    this.canvasSelectionService.mirrorAsset(
        objectToMirror,
        axis
    );

    console.log(
        `SELECTED ASSET MIRRORED: ${axis}`
    );

    return objectToMirror;
    }



}
