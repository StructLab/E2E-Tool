import { Component, ElementRef, NgZone, ViewChild } from '@angular/core'; /*turns this file into a UI component, Gives access to actual HTML element, Lets you grab something from your HTML, Helps Angular detect changes when something happens outside Angular*/
import { Assets } from "../assets/assets"; /*Import list of images/icons/assets*/
import { CommonModule } from '@angular/common'; /*Gives basic Angular features like: *ngIf *ngFor */
import {
  endPoint,
  exportData,
  LoadData,
  LoadItems,
  LoadRinfData,
  LoadRdfRailModel,
  LoadOsmData,
  Plan,
  Validate,
  enrichRinfGeometries
} from '../api/end_points';
import { EventService } from '../event.service';
import { NotificationService } from '../services/notification.service';
import { ButtonStateService } from '../canvas/canvasServices/button-state.service'; /*Tracks button states*/
import { NavbarBrand } from './navbar-brand/navbar-brand';
import { NavbarActions } from './navbar-actions/navbar-actions';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, NavbarBrand, NavbarActions],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  [x: string]: any;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  isOpen = false;
  fadeWelcome = false;
  static segmentProfileActive: boolean = false;
  static timingPointActive: boolean = false;
  constructor(private eventService: EventService, private ngZone: NgZone, private notificationService: NotificationService, public state: ButtonStateService) { }
  // Open file picker



  toggle() {
    this.isOpen = !this.isOpen;
  }

  svgFiles = [
    '/svgs/AxleCounter.svg',
  ];

  onDragStart(event: DragEvent, file: string) {
    event.dataTransfer?.setData('text/plain', file);
  }

  triggerImport() {

    this.fileInput.nativeElement.click();
  }
  // Handle selected file
  async handleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const files: File[] = Array.from(input.files);

    console.log('Selected files:', files);

    try {
      // Only allow exactly ONE RDF or TTL file
      if (files.length !== 1) {
        throw new Error(
          'Please select exactly one RDF or TTL file.'
        );
      }

      const file = files[0];
      const fileName = file.name.toLowerCase();

      // Check extension
      if (
        !fileName.endsWith('.rdf') &&
        !fileName.endsWith('.ttl')
      ) {
        throw new Error(
          'Only RDF or TTL files are supported.'
        );
      }

      console.log(
        'Uploading RDF/TTL file:',
        file.name
      );

      // Send file to backend
      const result = await this.UploadTtlRdf(file);

      console.log(
        'RDF/TTL import result:',
        result
      );

      this.notificationService.notify({
        type: 'success',
        operation: 'RDF Import',
        text:
          `RDF/TTL imported successfully. ` +
          `${result.tracks?.length ?? 0} tracks loaded.`
      });

      // Refresh canvas
      this.eventService.triggerCanvas();

      this.ngZone.run(() => {
        this.fadeWelcome = true;
      });

    } catch (err) {

      console.error(
        'RDF/TTL upload failed:',
        err
      );

      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Unknown import error';

      this.notificationService.notify({
        type: 'error',
        operation: 'RDF Import',
        text: errorMessage
      });
    }
  }
  async UploadTtlRdf(file: File): Promise<any> {
    const formData = new FormData();

    formData.append('file', file);

    const response = await fetch(
      `${endPoint}/upload`,
      {
        method: 'POST',
        body: formData
      }
    );;

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Upload failed (${response.status}): ${errorText}`
      );
    }
    return await response.json();
  }
  async exportFile() {
    try {
      console.log('Starting RDF export...');

      let handle: any = null;

      if ('showSaveFilePicker' in window) {
        handle = await (window as any).showSaveFilePicker({
          suggestedName: 'ModelRailway.ttl',
          types: [
            {
              description: 'Turtle RDF File',
              accept: {
                'text/turtle': ['.ttl']
              }
            }
          ]
        });
      }

      await exportData(handle);

      this.notificationService.notify({
        type: 'success',
        text: 'RDF file exported successfully.',
        operation: 'export'
      });
    } catch (error) {
      console.error('RDF export failed:', error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown RDF export error';

      this.notificationService.notify({
        type: 'error',
        text: errorMessage,
        operation: 'export'
      });
    }
  }

  async plan() {
    try {
      const planning = await Plan();

      await LoadItems("axleCounters", this.notificationService);
      await LoadItems("etcsMarkers", this.notificationService);
      await LoadItems("balsieGroups", this.notificationService);

      this.notificationService.notify({
        type: 'success',
        operation: 'Plan',
        text: 'Planning completed successfully. Railway assets were generated and loaded.'
      });

      console.log("finished planning", planning);

    } catch (err) {
      console.error('Planning failed:', err);

      this.notificationService.notify({
        type: 'error',
        operation: 'Plan',
        text: 'Planning failed. Please check the imported layout and try again.'
      });
    }
  }
  /*
  async timingPoint() {
    this.state.timingPointActive = !this.state.timingPointActive;
    this.state.segmentProfileActive = false;
    console.log("Timing point mode:", this.state.timingPointActive ? "ON" : "OFF");
  }

  async segmentProfile() {
    this.state.segmentProfileActive = !this.state.segmentProfileActive;
    this.state.timingPointActive = false;
    console.log("Segment profile mode:", this.state.segmentProfileActive ? "ON" : "OFF");
  }
  */


}





