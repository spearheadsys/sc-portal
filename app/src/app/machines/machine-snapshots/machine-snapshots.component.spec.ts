import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineSnapshotsComponent } from './machine-snapshots.component';

describe('MachineSnapshotsComponent', () => {
  let component: MachineSnapshotsComponent;
  let fixture: ComponentFixture<MachineSnapshotsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MachineSnapshotsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MachineSnapshotsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
