import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetSearch } from './asset-search';

describe('AssetSearch', () => {
  let component: AssetSearch;
  let fixture: ComponentFixture<AssetSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
