import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserRolesEditorComponent } from './user-roles-editor.component';

describe('UserRolesEditorComponent', () => {
  let component: UserRolesEditorComponent;
  let fixture: ComponentFixture<UserRolesEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserRolesEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserRolesEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
