import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportStatusBlock } from './report-status-block';

describe('ReportStatusBlock', () => {
  let component: ReportStatusBlock;
  let fixture: ComponentFixture<ReportStatusBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportStatusBlock]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportStatusBlock);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
