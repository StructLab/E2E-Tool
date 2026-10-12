import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarBrand } from './navbar-brand';

describe('NavbarBrand', () => {
  let component: NavbarBrand;
  let fixture: ComponentFixture<NavbarBrand>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarBrand]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavbarBrand);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
