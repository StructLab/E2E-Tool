import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EventService } from '../event.service';

interface AssetItem {
  name: string;
  file: string;
  category: string;
}

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [CommonModule, FormsModule],   // <-- include here
  templateUrl: './assets.html',  // separate HTML file
  styleUrls: ['./assets.css']    // separate CSS file
})

export class Assets {
  constructor(private eventService: EventService) {}
  searchText = '';

  assets: AssetItem[] = [
    {
      name: 'Axle Counter',
      file: '/svgs/AxleCounter.svg',
      category: 'Track Element'
    },
    {
      name: 'Balise Group',
      file: '/svgs/BaliseGroup.svg',
      category: 'ETCS'
    },
    {
      name: 'ETCS Marker',
      file: '/svgs/ETCSmarker.svg',
      category: 'ETCS'
    }
  ];

  get filteredAssets(): AssetItem[] {
    const value = this.searchText.trim().toLowerCase();

    if (!value) {
      return this.assets;
    }

    return this.assets.filter(asset =>
      asset.name.toLowerCase().includes(value) ||
      asset.category.toLowerCase().includes(value)
    );
  }

  onDragStart(event: DragEvent, asset: AssetItem): void {
    if (!event.dataTransfer) {
      return;
    }

    event.dataTransfer.setData('text/plain', asset.file);
    event.dataTransfer.effectAllowed = 'copy';
  }

  enableLineMode(): void {
    this.eventService.triggerLineMode();
  }

  enableCircleMode(): void {
  this.eventService.triggerCircleMode();
}

enableCurveMode(): void {
  this.eventService.triggerCurveMode();
}

enableArcMode(): void {
  this.eventService.triggerArcMode();
}

enableClothoidMode(): void {
  this.eventService.triggerClothoidMode();
}

enablePolylineMode(): void {
  this.eventService.triggerPolylineMode();
}

  getAssetClass(asset: any): string {
  const name = asset.name?.toLowerCase() || '';

  if (name.includes('axle')) {
    return 'asset-axle-counter';
  }

  if (name.includes('balise')) {
    return 'asset-balise-group';
  }

  if (name.includes('etcs')) {
    return 'asset-etcs-marker';
  }

  if (name.includes('buffer')) {
    return 'asset-buffer-stop';
  }

  if (name.includes('timing')) {
    return 'asset-timing-point';
  }

  if (name.includes('segment')) {
    return 'asset-segment-profile';
  }

  return '';
}

selectAsset(asset: any): void {
  console.log('ASSET CLICKED FROM PANEL:', asset);

  this.eventService.selectAsset(asset);
}
}

