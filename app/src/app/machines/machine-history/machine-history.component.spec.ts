import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineHistoryComponent } from './machine-history.component';

describe('MachineHistoryComponent', () => {
  let component: MachineHistoryComponent;
  let fixture: ComponentFixture<MachineHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MachineHistoryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MachineHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
