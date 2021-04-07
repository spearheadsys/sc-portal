import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DockerRegistryEditorComponent } from './docker-registry-editor.component';

describe('DockerRegistryEditorComponent', () => {
  let component: DockerRegistryEditorComponent;
  let fixture: ComponentFixture<DockerRegistryEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DockerRegistryEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DockerRegistryEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
