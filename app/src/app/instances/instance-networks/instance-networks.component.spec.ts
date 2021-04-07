import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstanceNetworksComponent } from './instance-networks.component';

describe('InstanceNetworksComponent', () => {
  let component: InstanceNetworksComponent;
  let fixture: ComponentFixture<InstanceNetworksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InstanceNetworksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InstanceNetworksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
