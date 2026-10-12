import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Telegram } from './telegram';

describe('Telegram', () => {
  let component: Telegram;
  let fixture: ComponentFixture<Telegram>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Telegram]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Telegram);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
