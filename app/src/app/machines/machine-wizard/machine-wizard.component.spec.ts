import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineWizardComponent } from './machine-wizard.component';

describe('MachineWizardComponent', () => {
  let component: MachineWizardComponent;
  let fixture: ComponentFixture<MachineWizardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MachineWizardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MachineWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
