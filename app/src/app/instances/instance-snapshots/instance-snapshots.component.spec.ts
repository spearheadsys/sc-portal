import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstanceSnapshotsComponent } from './instance-snapshots.component';

describe('InstanceSnapshotsComponent', () => {
  let component: InstanceSnapshotsComponent;
  let fixture: ComponentFixture<InstanceSnapshotsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InstanceSnapshotsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InstanceSnapshotsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
