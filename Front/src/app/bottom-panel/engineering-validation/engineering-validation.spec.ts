import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngineeringValidation } from './engineering-validation';

describe('EngineeringValidation', () => {
  let component: EngineeringValidation;
  let fixture: ComponentFixture<EngineeringValidation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngineeringValidation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngineeringValidation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
