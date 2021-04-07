import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DockerImageEditorComponent } from './docker-image-editor.component';

describe('DockerImageEditorComponent', () => {
  let component: DockerImageEditorComponent;
  let fixture: ComponentFixture<DockerImageEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DockerImageEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DockerImageEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
