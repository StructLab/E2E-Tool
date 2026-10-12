import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as THREE from 'three';

type Point2D = [number, number];

//backend odes not have switch dvisions so we take generic switch and derive switch type
interface BackendSwitchPoint {
  x: number;
  y: number;
  z: number;
}

interface GenericBackendSwitchDto {
  type: 'Switch';
  name: string;
  points: BackendSwitchPoint[];
}

interface TrackDto {
  id: string;
  points: Point2D[];
}

type SwitchKind =
  | 'EinfacheWeiche'
  | 'Bogenweiche'
  | 'EinfacheKreuzungsweiche'
  | 'DoppelteKreuzungsweiche';

interface Line2D {
  start: Point2D;
  end: Point2D;
}

interface TurnoutSwitchDto {
  id: string;
  type: 'EinfacheWeiche' | 'Bogenweiche';
  label: string;

  switchStartPoint: Point2D;
  switchCenterPoint: Point2D;

  stockTrackPoint: Point2D;
  branchTrackPoint: Point2D;

  /**
   * Optional polyline paths.
   * These are especially useful for Bogenweiche because the routes may be curved.
   * If omitted, rendering falls back to center -> reference point.
   */
  stockTrackPath?: Point2D[];
  branchTrackPath?: Point2D[];

  /**
   * Preferred backend input for the fouling marker.
   */
  foulingMarkerLines?: Line2D[];

  /**
   * Temporary fallback if the backend does not yet send foulingMarkerLines.
   */
  foulingMarkerDistanceFromSwitchCenter?: number;

  referenceLabelPoint?: Point2D;
}

interface CrossingSwitchDto {
  id: string;
  type:
    | 'EinfacheKreuzungsweiche'
    | 'DoppelteKreuzungsweiche';

  label: string;

  crossingCenterPoint: Point2D;

  crossingRoutes: {
    routeA: Line2D;
    routeB: Line2D;
  };

  /**
   * Preferred backend input for the fouling markers.
   */
  foulingMarkerLines?: Line2D[];

  /**
   * Temporary fallback if the backend does not yet send foulingMarkerLines.
   */
  foulingMarkerDistanceFromCrossingCenter?: number;

  /**
   * EKW normally contains one slip-direction line.
   * DKW normally contains two.
   */
  divergingDirectionLines: Line2D[];
}

type BackendSwitchDto =
  | TurnoutSwitchDto
  | CrossingSwitchDto
  | GenericBackendSwitchDto;

interface SwitchRenderContext {
  group: THREE.Group;
  lineMaterial: THREE.LineBasicMaterial;
  wedgeMaterial: THREE.MeshBasicMaterial;
}

@Injectable({ providedIn: 'root' })
export class TracksService {
    private readonly cleanDataUrl =
  'http://localhost:5114/clean';
  private readonly tracksUrl =
  'http://localhost:5114/tracks';
  private readonly switchesUrl =
    'http://localhost:5114/switches';

  constructor(
    private readonly http: HttpClient
  ) {}
  async cleanData(scene: THREE.Scene): Promise<void> {
  try {
    await firstValueFrom(
      this.http.put<void>(this.cleanDataUrl, null)
    );

    // Clear the Three.js scene
    scene.clear();

  } catch (error) {
    console.error(
      'Could not clean data from the backend:',
      error
    );
  }
  }
  /**
   * Kept so existing calls do not break.
   * Hard-coded sample track and switch creation has been removed.
   */
  async createTracks(
    scene: THREE.Scene
  ): Promise<void> {
    try {
      const tracks = await firstValueFrom(
        this.http.get<TrackDto[]>(
          this.tracksUrl
        )
      );

      console.log(
        'Tracks received from backend:',
        tracks
      );

      this.clearBackendTracks(scene);

      const material =
        new THREE.LineBasicMaterial({
          color: 0xffffff
        });

      for (const track of tracks ?? []) {
        if (
          !track.points ||
          track.points.length < 2
        ) {
          continue;
        }

        const points = track.points.map(
          point =>
            new THREE.Vector3(
              point[0],
              point[1],
              0
            )
        );

        const geometry =
          new THREE.BufferGeometry()
            .setFromPoints(points);

        const line = new THREE.Line(
          geometry,
          material.clone()
        );

        line.userData = {
          id: track.id,
          type: 'BackendTrack',
          source: 'BackendRailwayTrack',
          layer: 'Tracks',
          draggable: false
        };

        line.renderOrder = 100;

        scene.add(line);
      }

      console.log(
        `${tracks.length} backend tracks added to the scene`
      );
    } catch (error) {
      console.error(
        'Could not load tracks from the backend:',
        error
      );
    }
  }
  private clearBackendTracks(
  scene: THREE.Scene
): void {
  const objectsToRemove:
    THREE.Object3D[] = [];

  scene.traverse(object => {
    if (
      object.userData?.['source'] ===
      'BackendRailwayTrack'
    ) {
      objectsToRemove.push(object);
    }
  });

  for (const object of objectsToRemove) {
    object.removeFromParent();

    const line = object as THREE.Line;

    line.geometry?.dispose();

    const material = line.material as
      | THREE.Material
      | THREE.Material[];

    if (Array.isArray(material)) {
      for (const item of material) {
        item.dispose();
      }
    } else {
      material?.dispose();
    }
  }
}
public drawSwitchShadedArea(
  scene: THREE.Scene,
  switchData: GenericBackendSwitchDto
): void {

  const points = switchData.points;

  if (!points || points.length < 3) {
    return;
  }

  // Calculate center
  const centerX =
    points.reduce((sum, p) => sum + p.x, 0) / points.length;

  const centerY =
    points.reduce((sum, p) => sum + p.y, 0) / points.length;

  // Order points around the center
  const orderedPoints = [...points].sort((a, b) => {
    const angleA = Math.atan2(
      a.y - centerY,
      a.x - centerX
    );

    const angleB = Math.atan2(
      b.y - centerY,
      b.x - centerX
    );

    return angleA - angleB;
  });

  // Create outline
  const shape = new THREE.Shape();

  shape.moveTo(
    orderedPoints[0].x,
    orderedPoints[0].y
  );

  for (let i = 1; i < orderedPoints.length; i++) {
    shape.lineTo(
      orderedPoints[i].x,
      orderedPoints[i].y
    );
  }

  shape.closePath();

  // Solid filled geometry
  const geometry = new THREE.ShapeGeometry(shape);

  const material = new THREE.MeshBasicMaterial({
    color: 0x888888,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(
    geometry,
    material
  );

  mesh.position.z = -0.1;

  scene.add(mesh);
}
  /**
   * Loads all real switch definitions from the backend.
   */
  public async drawSwitchs(
    scene: THREE.Scene
  ): Promise<void> {
    try {
      const switches = await firstValueFrom(
        this.http.get<BackendSwitchDto[]>(
          this.switchesUrl
        )
      );
      this.clearSwitchSymbols(scene);
      
      for (const switchData of switches ?? []) {
         if (switchData.type === 'Switch') {
    this.drawSwitchShadedArea(scene, switchData);
  }
        switch (switchData.type) {
          case 'EinfacheWeiche':
          case 'Bogenweiche':
            this.drawTurnoutSwitchSymbol(
              scene,
              switchData
            );
            break;

          case 'EinfacheKreuzungsweiche':
          case 'DoppelteKreuzungsweiche':
            this.drawCrossingSwitchSymbol(
              scene,
              switchData
            );
            break;
          
          case 'Switch':
            this.drawGenericBackendSwitch(
              scene,
              switchData
            );
            break;

          default:
            console.warn(
              'Unsupported switch type received from backend:',
              switchData
            );
        }
      }
    } catch (error) {
      console.error(
        'Could not load switches from the backend:',
        error
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Shared geometry helpers
  // ---------------------------------------------------------------------------

  private toVector(
    point: Point2D,
    z = 0
  ): THREE.Vector3 {
    return new THREE.Vector3(
      point[0],
      point[1],
      z
    );
  }

  private toPath(
    points: Point2D[],
    z = 0
  ): THREE.Vector3[] {
    return points.map(
      point => this.toVector(point, z)
    );
  }

  private direction(
    from: THREE.Vector3,
    to: THREE.Vector3
  ): THREE.Vector3 | null {
    const direction = to
      .clone()
      .sub(from);

    direction.z = 0;

    if (direction.lengthSq() === 0) {
      return null;
    }

    return direction.normalize();
  }

  private normalOf(
    direction: THREE.Vector3
  ): THREE.Vector3 {
    return new THREE.Vector3(
      -direction.y,
      direction.x,
      0
    ).normalize();
  }

  /**
   * Returns a point at the given distance from the first point of a path.
   * Works for straight and polyline/curved routes.
   */
  private pointAtDistanceOnPath(
    path: THREE.Vector3[],
    distance: number
  ): THREE.Vector3 {
    if (path.length === 0) {
      return new THREE.Vector3();
    }

    if (
      path.length === 1 ||
      distance <= 0
    ) {
      return path[0].clone();
    }

    let remainingDistance = distance;

    for (
      let index = 0;
      index < path.length - 1;
      index++
    ) {
      const start = path[index];
      const end = path[index + 1];

      const segment = end
        .clone()
        .sub(start);

      segment.z = 0;

      const segmentLength =
        segment.length();

      if (segmentLength === 0) {
        continue;
      }

      if (
        remainingDistance <= segmentLength
      ) {
        return start
          .clone()
          .add(
            segment
              .normalize()
              .multiplyScalar(
                remainingDistance
              )
          );
      }

      remainingDistance -=
        segmentLength;
    }

    return path[
      path.length - 1
    ].clone();
  }

  private createSwitchRenderContext(
    type: SwitchKind,
    id: string
  ): SwitchRenderContext {
    const group = new THREE.Group();

    group.userData = {
      type: 'Switch',
      source: 'BackendSwitchSymbol',
      layer: 'Switches',
      switchType: type,
      id,
      draggable: false
    };

    return {
      group,
      lineMaterial:
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          depthTest: false
        }),
      wedgeMaterial:
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          depthTest: false
        })
    };
  }

  private addLine(
    group: THREE.Group,
    start: THREE.Vector3,
    end: THREE.Vector3,
    material: THREE.Material,
    z = 1.45,
    renderOrder = 360
  ): THREE.Line {
    const geometry =
      new THREE.BufferGeometry()
        .setFromPoints([
          new THREE.Vector3(
            start.x,
            start.y,
            z
          ),
          new THREE.Vector3(
            end.x,
            end.y,
            z
          )
        ]);

    const line = new THREE.Line(
      geometry,
      material.clone()
    );

    line.renderOrder = renderOrder;

    group.add(line);

    return line;
  }

  private addLineFromDto(
    group: THREE.Group,
    lineData: Line2D,
    material: THREE.Material,
    z = 1.45,
    renderOrder = 360
  ): void {
    this.addLine(
      group,
      this.toVector(
        lineData.start,
        z
      ),
      this.toVector(
        lineData.end,
        z
      ),
      material,
      z,
      renderOrder
    );
  }

  private addTick(
    group: THREE.Group,
    center: THREE.Vector3,
    normal: THREE.Vector3,
    size: number,
    material: THREE.Material,
    z = 1.35,
    renderOrder = 330
  ): void {
    const start = center
      .clone()
      .sub(
        normal
          .clone()
          .multiplyScalar(size)
      );

    const end = center
      .clone()
      .add(
        normal
          .clone()
          .multiplyScalar(size)
      );

    this.addLine(
      group,
      start,
      end,
      material,
      z,
      renderOrder
    );
  }

  private addWedge(
    group: THREE.Group,
    tip: THREE.Vector3,
    routePointA: THREE.Vector3,
    routePointB: THREE.Vector3,
    material: THREE.Material
  ): void {
    const shape = new THREE.Shape();

    shape.moveTo(tip.x, tip.y);
    shape.lineTo(
      routePointA.x,
      routePointA.y
    );
    shape.lineTo(
      routePointB.x,
      routePointB.y
    );
    shape.closePath();

    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      material
    );

    mesh.position.z = 0.9;
    mesh.renderOrder = 250;

    group.add(mesh);
  }

  private addCircleMarker(
    group: THREE.Group,
    center: THREE.Vector3,
    radius: number,
    material: THREE.Material
  ): void {
    const curve = new THREE.EllipseCurve(
      center.x,
      center.y,
      radius,
      radius,
      0,
      Math.PI * 2,
      false,
      0
    );

    const points = curve
      .getPoints(32)
      .map(
        point =>
          new THREE.Vector3(
            point.x,
            point.y,
            1.5
          )
      );

    const geometry =
      new THREE.BufferGeometry()
        .setFromPoints(points);

    const circle = new THREE.LineLoop(
      geometry,
      material.clone()
    );

    circle.renderOrder = 360;

    group.add(circle);
  }

  private drawGenericBackendSwitch(
  scene: THREE.Scene,
  switchData: GenericBackendSwitchDto
): void {
  if (
    !switchData.points ||
    switchData.points.length < 3
  ) {
    console.warn(
      'Generic switch does not contain at least three points:',
      switchData
    );
    return;
  }

  const switchPoint = new THREE.Vector3(
    switchData.points[0].x,
    switchData.points[0].y,
    1
  );

  const stockTrackPoint = new THREE.Vector3(
    switchData.points[1].x,
    switchData.points[1].y,
    1
  );

  const branchTrackPoint = new THREE.Vector3(
    switchData.points[2].x,
    switchData.points[2].y,
    1
  );

  const group = new THREE.Group();

  group.userData = {
    type: 'Switch',
    source: 'BackendSwitchSymbol',
    layer: 'Switches',
    switchType: 'GenericBackendSwitch',
    id: switchData.name,
    draggable: false
  };

  const lineMaterial =
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      depthTest: false
    });

  const wedgeMaterial =
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      depthTest: false
    });

  this.addLine(
    group,
    switchPoint,
    stockTrackPoint,
    lineMaterial,
    1.3,
    350
  );

  this.addLine(
    group,
    switchPoint,
    branchTrackPoint,
    lineMaterial,
    1.3,
    350
  );

  const stockPath = [
    switchPoint,
    stockTrackPoint
  ];

  const branchPath = [
    switchPoint,
    branchTrackPoint
  ];

  const wedgeLength = Math.min(
    12,
    switchPoint.distanceTo(
      stockTrackPoint
    ),
    switchPoint.distanceTo(
      branchTrackPoint
    )
  );

  const wedgeStockPoint =
    this.pointAtDistanceOnPath(
      stockPath,
      wedgeLength
    );

  const wedgeBranchPoint =
    this.pointAtDistanceOnPath(
      branchPath,
      wedgeLength
    );

  this.addWedge(
    group,
    switchPoint,
    wedgeStockPoint,
    wedgeBranchPoint,
    wedgeMaterial
  );

  this.addCanvasText(
    group,
    switchData.name,
    new THREE.Vector3(
      switchPoint.x,
      switchPoint.y + 12,
      1.5
    ),
    7
  );

  scene.add(group);
}

  // ---------------------------------------------------------------------------
  // Turnout switches: EinfacheWeiche and Bogenweiche
  // ---------------------------------------------------------------------------

  private drawTurnoutSwitchSymbol(
    scene: THREE.Scene,
    switchData: TurnoutSwitchDto
  ): void {
    const center = this.toVector(
      switchData.switchCenterPoint,
      1
    );

    const start = this.toVector(
      switchData.switchStartPoint,
      1
    );

    const stockPoint = this.toVector(
      switchData.stockTrackPoint,
      1
    );

    const branchPoint = this.toVector(
      switchData.branchTrackPoint,
      1
    );

    const stockDirection =
      this.direction(
        center,
        stockPoint
      );

    const branchDirection =
      this.direction(
        center,
        branchPoint
      );

    const startDirection =
      this.direction(
        center,
        start
      );

    if (
      !stockDirection ||
      !branchDirection ||
      !startDirection
    ) {
      console.warn(
        'Invalid turnout switch geometry:',
        switchData
      );
      return;
    }

    const mainNormal =
      this.normalOf(stockDirection);

    const cross =
      stockDirection.x *
        branchDirection.y -
      stockDirection.y *
        branchDirection.x;

    const branchSide =
      cross >= 0 ? 1 : -1;

    const labelNormal = mainNormal
      .clone()
      .multiplyScalar(branchSide);

    const stockPath = this.toPath(
      switchData.stockTrackPath ?? [
        switchData.switchCenterPoint,
        switchData.stockTrackPoint
      ],
      1
    );

    const branchPath = this.toPath(
      switchData.branchTrackPath ?? [
        switchData.switchCenterPoint,
        switchData.branchTrackPoint
      ],
      1
    );

    const symbolWedgeLength = 28;
    const tickSize = 8;

    const wedgeStockPoint =
      this.pointAtDistanceOnPath(
        stockPath,
        symbolWedgeLength
      );

    const wedgeBranchPoint =
      this.pointAtDistanceOnPath(
        branchPath,
        symbolWedgeLength
      );

    const {
      group,
      lineMaterial,
      wedgeMaterial
    } = this.createSwitchRenderContext(
      switchData.type,
      switchData.id
    );

    if (
      switchData.type ===
      'EinfacheWeiche'
    ) {
      this.addLine(
        group,
        start,
        center,
        lineMaterial,
        1.2,
        300
      );

      this.addTick(
        group,
        start,
        mainNormal,
        tickSize,
        lineMaterial,
        1.25,
        310
      );

      if (
        switchData.referenceLabelPoint
      ) {
        const referencePosition =
          this.toVector(
            switchData
              .referenceLabelPoint,
            1.5
          );

        this.addCanvasText(
          group,
          'Pr',
          referencePosition,
          9
        );
      }

      this.addTick(
        group,
        center,
        mainNormal,
        tickSize,
        lineMaterial,
        1.3,
        320
      );
    } else {
      this.addCircleMarker(
        group,
        start,
        5,
        lineMaterial
      );
    }

    this.addWedge(
      group,
      center,
      wedgeBranchPoint,
      wedgeStockPoint,
      wedgeMaterial
    );

    if (
      switchData
        .foulingMarkerLines
        ?.length
    ) {
      for (
        const line of
        switchData.foulingMarkerLines
      ) {
        this.addLineFromDto(
          group,
          line,
          lineMaterial,
          1.5,
          370
        );
      }
    } else if (
      switchData
        .foulingMarkerDistanceFromSwitchCenter !==
      undefined
    ) {
      const foulingStockPoint =
        this.pointAtDistanceOnPath(
          stockPath,
          switchData
            .foulingMarkerDistanceFromSwitchCenter
        );

      const foulingBranchPoint =
        this.pointAtDistanceOnPath(
          branchPath,
          switchData
            .foulingMarkerDistanceFromSwitchCenter
        );

      this.addLine(
        group,
        foulingStockPoint,
        foulingBranchPoint,
        lineMaterial,
        1.5,
        370
      );
    }

    const numberPosition = center
      .clone()
      .add(
        labelNormal.multiplyScalar(18)
      );

    this.addCanvasText(
      group,
      switchData.label,
      new THREE.Vector3(
        numberPosition.x,
        numberPosition.y,
        1.5
      ),
      11
    );

    scene.add(group);
  }

  // ---------------------------------------------------------------------------
  // Crossing switches: EKW and DKW
  // ---------------------------------------------------------------------------

  private drawCrossingSwitchSymbol(
    scene: THREE.Scene,
    switchData: CrossingSwitchDto
  ): void {
    const center = this.toVector(
      switchData.crossingCenterPoint,
      1
    );

    const routeAStart =
      this.toVector(
        switchData
          .crossingRoutes
          .routeA
          .start,
        1
      );

    const routeAEnd =
      this.toVector(
        switchData
          .crossingRoutes
          .routeA
          .end,
        1
      );

    const routeBStart =
      this.toVector(
        switchData
          .crossingRoutes
          .routeB
          .start,
        1
      );

    const routeBEnd =
      this.toVector(
        switchData
          .crossingRoutes
          .routeB
          .end,
        1
      );

    const {
      group,
      lineMaterial,
      wedgeMaterial
    } = this.createSwitchRenderContext(
      switchData.type,
      switchData.id
    );

    const wedgeLength = 28;

    this.addCrossingSideWedge(
      group,
      center,
      routeAStart,
      routeBStart,
      wedgeLength,
      wedgeMaterial
    );

    this.addCrossingSideWedge(
      group,
      center,
      routeAEnd,
      routeBEnd,
      wedgeLength,
      wedgeMaterial
    );

    if (
      switchData
        .foulingMarkerLines
        ?.length
    ) {
      for (
        const line of
        switchData.foulingMarkerLines
      ) {
        this.addLineFromDto(
          group,
          line,
          lineMaterial,
          1.5,
          370
        );
      }
    } else if (
      switchData
        .foulingMarkerDistanceFromCrossingCenter !==
      undefined
    ) {
      this.addCrossingFoulingLineFromRoutes(
        group,
        center,
        routeAStart,
        routeBStart,
        switchData
          .foulingMarkerDistanceFromCrossingCenter,
        lineMaterial
      );

      this.addCrossingFoulingLineFromRoutes(
        group,
        center,
        routeAEnd,
        routeBEnd,
        switchData
          .foulingMarkerDistanceFromCrossingCenter,
        lineMaterial
      );
    }

    const leftMiddle = routeAStart
      .clone()
      .add(routeBStart)
      .multiplyScalar(0.5);

    const rightMiddle = routeAEnd
      .clone()
      .add(routeBEnd)
      .multiplyScalar(0.5);

    const crossingAxis =
      this.direction(
        leftMiddle,
        rightMiddle
      );

    if (crossingAxis) {
      const centerTickDirection =
        this.normalOf(crossingAxis);

      this.addTick(
        group,
        center,
        centerTickDirection,
        6,
        lineMaterial,
        1.45,
        360
      );
    }

    for (
      const line of
      switchData.divergingDirectionLines ??
      []
    ) {
      this.addLineFromDto(
        group,
        line,
        lineMaterial,
        1.45,
        360
      );
    }

    this.addCanvasText(
      group,
      switchData.label,
      new THREE.Vector3(
        center.x,
        center.y + 20,
        1.5
      ),
      10
    );

    scene.add(group);
  }

  private addCrossingSideWedge(
    group: THREE.Group,
    center: THREE.Vector3,
    routeAOuter: THREE.Vector3,
    routeBOuter: THREE.Vector3,
    wedgeLength: number,
    wedgeMaterial: THREE.Material
  ): void {
    const routeAPath = [
      center,
      routeAOuter
    ];

    const routeBPath = [
      center,
      routeBOuter
    ];

    const wedgeA =
      this.pointAtDistanceOnPath(
        routeAPath,
        wedgeLength
      );

    const wedgeB =
      this.pointAtDistanceOnPath(
        routeBPath,
        wedgeLength
      );

    this.addWedge(
      group,
      center,
      wedgeA,
      wedgeB,
      wedgeMaterial
    );
  }

  private addCrossingFoulingLineFromRoutes(
    group: THREE.Group,
    center: THREE.Vector3,
    routeAOuter: THREE.Vector3,
    routeBOuter: THREE.Vector3,
    markerDistance: number,
    lineMaterial: THREE.Material
  ): void {
    const routeAPath = [
      center,
      routeAOuter
    ];

    const routeBPath = [
      center,
      routeBOuter
    ];

    const markerA =
      this.pointAtDistanceOnPath(
        routeAPath,
        markerDistance
      );

    const markerB =
      this.pointAtDistanceOnPath(
        routeBPath,
        markerDistance
      );

    this.addLine(
      group,
      markerA,
      markerB,
      lineMaterial,
      1.5,
      370
    );
  }

  // ---------------------------------------------------------------------------
  // Cleanup and text
  // ---------------------------------------------------------------------------

  private clearSwitchSymbols(
    scene: THREE.Scene
  ): void {
    const objectsToRemove:
      THREE.Object3D[] = [];

    scene.traverse(object => {
      if (
        object.userData?.['source'] ===
        'BackendSwitchSymbol'
      ) {
        objectsToRemove.push(object);
      }
    });

    for (
      const object of objectsToRemove
    ) {
      object.removeFromParent();

      object.traverse(child => {
        const renderable =
          child as THREE.Mesh;

        renderable.geometry?.dispose();

        const material =
          renderable.material as
            | THREE.Material
            | THREE.Material[]
            | undefined;

        if (Array.isArray(material)) {
          for (
            const item of material
          ) {
            item.dispose();
          }
        } else {
          material?.dispose();
        }

        if (
          child instanceof THREE.Sprite &&
          child.material.map
        ) {
          child.material.map.dispose();
        }
      });
    }
  }

  private addCanvasText(
    parent: THREE.Object3D,
    text: string,
    position: THREE.Vector3,
    fontSize: number
  ): void {
    const canvas =
      document.createElement('canvas');

    canvas.width = 128;
    canvas.height = 64;

    const context =
      canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.font =
      `${fontSize * 2}px Arial`;

    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    context.fillText(
      text,
      canvas.width / 2,
      canvas.height / 2
    );

    const texture =
      new THREE.CanvasTexture(canvas);

    texture.needsUpdate = true;

    const material =
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
      });

    const sprite =
      new THREE.Sprite(material);

    sprite.position.copy(position);

    sprite.scale.set(
      fontSize * 2.2,
      fontSize * 1.1,
      1
    );

    sprite.renderOrder = 300;

    parent.add(sprite);
  }
}