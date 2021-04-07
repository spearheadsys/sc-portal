import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstanceTagEditorComponent } from './instance-tag-editor.component';

describe('InstanceTagEditorComponent', () => {
  let component: InstanceTagEditorComponent;
  let fixture: ComponentFixture<InstanceTagEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InstanceTagEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InstanceTagEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
