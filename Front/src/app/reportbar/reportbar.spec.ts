import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reportbar } from './reportbar';

describe('Reportbar', () => {
  let component: Reportbar;
  let fixture: ComponentFixture<Reportbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reportbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Reportbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
