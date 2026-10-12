import { Component } from '@angular/core';
import { EngineeringValidation } from './engineering-validation/engineering-validation';
import { QuickAction } from './quick-action/quick-action';
import { ReportStatusBlock } from './report-status-block/report-status-block';

@Component({
  selector: 'app-bottom-panel',
  standalone: true,
  imports: [EngineeringValidation,
    QuickAction, ReportStatusBlock],
  templateUrl: './bottom-panel.html',
  styleUrl: './bottom-panel.css',
})
export class BottomPanel {

}
