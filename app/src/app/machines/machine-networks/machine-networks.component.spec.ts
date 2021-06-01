import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineNetworksComponent } from './machine-networks.component';

describe('MachineNetworksComponent', () => {
  let component: MachineNetworksComponent;
  let fixture: ComponentFixture<MachineNetworksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MachineNetworksComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MachineNetworksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
