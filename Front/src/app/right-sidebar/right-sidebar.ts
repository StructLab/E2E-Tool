import { Component } from '@angular/core';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [],
  templateUrl: './right-sidebar.html',
  styleUrl: './right-sidebar.css',
})
export class RightSidebar {

  // Placeholder values for layout only
  projectName: string = 'Demo_Project';
  coordinateSystem: string = 'Local (m)';
  scale: string = '1:1000';
  gridSize: string = '10 m';

  // TODO: Later connect this to selected object on canvas
  selectedObject: any = null;
}