import { Component } from '@angular/core';
import { Assets } from '../assets/assets';
import { LayerList } from './layer-list/layer-list';

@Component({
  selector: 'app-left-sidebar',
  standalone: true,
  imports: [
    Assets,
    LayerList
  ],
  templateUrl: './left-sidebar.html',
  styleUrl: './left-sidebar.css',
})
export class LeftSidebar {

}