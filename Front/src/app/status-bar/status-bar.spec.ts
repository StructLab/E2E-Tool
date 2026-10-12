import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusBar } from './status-bar';

describe('StatusBar', () => {
  let component: StatusBar;
  let fixture: ComponentFixture<StatusBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatusBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
