import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineTagEditorComponent } from './machine-tag-editor.component';

describe('MachineTagEditorComponent', () => {
  let component: MachineTagEditorComponent;
  let fixture: ComponentFixture<MachineTagEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MachineTagEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MachineTagEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
