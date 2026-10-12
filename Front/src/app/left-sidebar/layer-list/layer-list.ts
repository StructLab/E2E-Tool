import { Component } from '@angular/core';
import { EventService } from '../../event.service';

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

  constructor(private eventService: EventService) {}

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

    // If already selected -> deselect it
    if (this.selectedLayers.has(layerName)) {
      this.selectedLayers.delete(layerName);
    } else {
      // Otherwise select it
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