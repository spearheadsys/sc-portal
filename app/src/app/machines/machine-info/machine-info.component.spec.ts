import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineInfoComponent } from './machine-info.component';

describe('MachineInfoComponent', () => {
  let component: MachineInfoComponent;
  let fixture: ComponentFixture<MachineInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MachineInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MachineInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
