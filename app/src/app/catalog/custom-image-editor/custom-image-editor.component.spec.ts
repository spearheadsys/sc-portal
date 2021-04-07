import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomImageEditorComponent } from './custom-image-editor.component';

describe('CustomImageEditorComponent', () => {
  let component: CustomImageEditorComponent;
  let fixture: ComponentFixture<CustomImageEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CustomImageEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomImageEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
