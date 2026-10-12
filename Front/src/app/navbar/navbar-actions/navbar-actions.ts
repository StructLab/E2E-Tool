import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar-actions',
  imports: [],
  templateUrl: './navbar-actions.html',
  styleUrl: './navbar-actions.css',
})
export class NavbarActions {
  onUndo(): void {
    console.log('Undo clicked');
  }

  onRedo(): void {
    console.log('Redo clicked');
  }

  onSettings(): void {
    console.log('Settings clicked');
  }

  onInfo(): void {
    console.log('Info clicked');
  }

}