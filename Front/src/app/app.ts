  import { Component, signal } from '@angular/core';
  import { RouterOutlet } from '@angular/router';
  import { Canvas } from './canvas/canvas';
  import { Navbar } from "./navbar/navbar";
  import { Reportbar } from "./reportbar/reportbar";
  import { Telegram } from "./telegram/telegram";
  import { WelcomeComponent } from './welcome-page/welcome.component';
  import { FooterBar } from './footer-bar/footer-bar';
  import { BottomPanel } from './bottom-panel/bottom-panel';
  import { LeftSidebar } from './left-sidebar/left-sidebar';
  import { RightSidebar } from './right-sidebar/right-sidebar';

  @Component({
    selector: 'app-root', 
    standalone: true,
    imports: [RouterOutlet, Canvas, Navbar, Reportbar, Telegram, WelcomeComponent, FooterBar, BottomPanel, LeftSidebar, RightSidebar],
    templateUrl: './app.html',
    styleUrl: './app.css', 
  })
  export class App {
    protected readonly title = signal('railtool');
  }
