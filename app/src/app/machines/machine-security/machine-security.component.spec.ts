import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineSecurityComponent } from './machine-security.component';

describe('MachineSecurityComponent', () => {
  let component: MachineSecurityComponent;
  let fixture: ComponentFixture<MachineSecurityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MachineSecurityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MachineSecurityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
