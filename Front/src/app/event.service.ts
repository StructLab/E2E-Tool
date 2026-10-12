import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { RinfEnrichedSection } from './api/end_points';

@Injectable({ providedIn: 'root' })
export class EventService {
  // Subject to emit events from WelcomePage
  private triggerCanvasSource = new Subject<void>();
  triggerCanvas$ = this.triggerCanvasSource.asObservable();

  // Call this to notify canvas
  triggerCanvas() {
    this.triggerCanvasSource.next();
  }

  private triggerLineModeSource = new Subject<void>();
  triggerLineMode$ = this.triggerLineModeSource.asObservable();

  triggerLineMode() {
    this.triggerLineModeSource.next();
  }

  private triggerCircleModeSource = new Subject<void>();
triggerCircleMode$ = this.triggerCircleModeSource.asObservable();

triggerCircleMode() {
  this.triggerCircleModeSource.next();
}

private triggerCurveModeSource = new Subject<void>();
triggerCurveMode$ = this.triggerCurveModeSource.asObservable();

triggerCurveMode() {
  this.triggerCurveModeSource.next();
}

private triggerClothoidModeSource = new Subject<void>();
triggerClothoidMode$ = this.triggerClothoidModeSource.asObservable();

triggerClothoidMode(): void {
  this.triggerClothoidModeSource.next();
}

  private selectedAssetSource = new Subject<any>();
  selectedAsset$ = this.selectedAssetSource.asObservable();

  selectAsset(asset: any): void {
    this.selectedAssetSource.next(asset);
  }

 private deleteSelectedSource = new Subject<void>();
  deleteSelected$ = this.deleteSelectedSource.asObservable();

  triggerDeleteSelected(): void {
    this.deleteSelectedSource.next();
}

private triggerPolylineModeSource = new Subject<void>();
triggerPolylineMode$ = this.triggerPolylineModeSource.asObservable();

triggerPolylineMode(): void {
  this.triggerPolylineModeSource.next();
}

private duplicateSelectedSource = new Subject<void>();
duplicateSelected$ = this.duplicateSelectedSource.asObservable();

triggerDuplicateSelected(): void {
  this.duplicateSelectedSource.next();
}

private mirrorSelectedSource = new Subject<'horizontal' | 'vertical'>();
mirrorSelected$ = this.mirrorSelectedSource.asObservable();

triggerMirrorSelected(axis: 'horizontal' | 'vertical'): void {
  this.mirrorSelectedSource.next(axis);
}

private selectionStateSource = new Subject<boolean>();
selectionState$ = this.selectionStateSource.asObservable();

setSelectionState(hasSelection: boolean): void {
  this.selectionStateSource.next(hasSelection);
}

private centerViewSource = new Subject<void>();
centerView$ = this.centerViewSource.asObservable();

triggerCenterView(): void {
  this.centerViewSource.next();
}

private layerHighlightSource = new Subject<string[]>();

layerHighlight$ = this.layerHighlightSource.asObservable();

triggerLayerHighlight(layerNames: string[]): void {
  this.layerHighlightSource.next(layerNames);
}

private rinfSectionsSource =
  new Subject<RinfEnrichedSection[]>();

rinfSections$ =
  this.rinfSectionsSource.asObservable();

sendRinfSections(
  sections: RinfEnrichedSection[]
): void {
  this.rinfSectionsSource.next(sections);
}

private canvasStatusSource = new BehaviorSubject({
  mode: 'Select',
  x: 0,
  y: 0,
  z: 0,
  grid: 10
});

private triggerArcModeSource = new Subject<void>();
triggerArcMode$ = this.triggerArcModeSource.asObservable();

triggerArcMode(): void {
  this.triggerArcModeSource.next();
}

canvasStatus$ = this.canvasStatusSource.asObservable();

updateCanvasStatus(status: {
  mode?: string;
  x?: number;
  y?: number;
  z?: number;
  grid?: number;
}): void {
  const current = this.canvasStatusSource.value;

  this.canvasStatusSource.next({
    ...current,
    ...status
  });
}
}