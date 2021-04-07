import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolePoliciesEditorComponent } from './role-policies-editor.component';

describe('RolePoliciesEditorComponent', () => {
  let component: RolePoliciesEditorComponent;
  let fixture: ComponentFixture<RolePoliciesEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RolePoliciesEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RolePoliciesEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
