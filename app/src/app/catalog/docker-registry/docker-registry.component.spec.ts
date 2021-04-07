import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DockerRegistryComponent } from './docker-registry.component';

describe('DockerRegistryComponent', () => {
  let component: DockerRegistryComponent;
  let fixture: ComponentFixture<DockerRegistryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DockerRegistryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DockerRegistryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
