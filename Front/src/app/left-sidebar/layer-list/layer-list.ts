
import { Component } from '@angular/core';
import { EventService } from '../../event.service';

import { IconScaleService } from '../../canvas/canvasServices/icon-scale.service';
import { CanvasSceneService } from '../../canvas/canvasServices/canvas-scene.service';

interface LayerItem {
  name: string;
  visible: boolean;
  locked: boolean;
}

@Component({
  selector: 'app-layer-list',
  standalone: true,
  imports: [],
  templateUrl: './layer-list.html',
  styleUrl: './layer-list.css',
})
export class LayerList {

  constructor(
    private eventService: EventService,
    private iconScaleService: IconScaleService,
    private canvasSceneService: CanvasSceneService
  ) {}

  // ================================
  // ICON SCALE ADJUSTMENT
  // ================================

  iconScalePercent = 100;

  onIconScaleChange(value: number): void {
    this.iconScalePercent = value;

    const scene = this.canvasSceneService.scene;

    if (!scene) {
      return;
    }

    this.iconScaleService.setScale(
      value / 100,
      scene
    );
  }

  resetIconScale(): void {
    this.iconScalePercent = 100;

    const scene = this.canvasSceneService.scene;

    if (!scene) {
      return;
    }

    this.iconScaleService.resetScale(scene);
  }

  // ================================
  // EXISTING LAYERS
  // ================================

  layers: LayerItem[] = [
    {
      name: 'Tracks',
      visible: true,
      locked: false
    },
    {
      name: 'Switches',
      visible: true,
      locked: false
    },
    {
      name: 'Signals',
      visible: true,
      locked: false
    },
    {
      name: 'Balises',
      visible: true,
      locked: false
    },

    /*
    {
      name: 'Timing Points',
      visible: true,
      locked: false
    },
    {
      name: 'Segment Profiles',
      visible: true,
      locked: false
    }
    */
  ];

  selectedLayers: Set<string> = new Set<string>();

  highlightLayer(layerName: string): void {

    if (this.selectedLayers.has(layerName)) {
      this.selectedLayers.delete(layerName);
    } else {
      this.selectedLayers.add(layerName);
    }

    console.log(
      'SELECTED LAYERS:',
      Array.from(this.selectedLayers)
    );

    this.eventService.triggerLayerHighlight(
      Array.from(this.selectedLayers)
    );
  }

  toggleVisibility(layer: LayerItem): void {
    layer.visible = !layer.visible;
  }

  toggleLock(layer: LayerItem): void {
    layer.locked = !layer.locked;
  }
}
