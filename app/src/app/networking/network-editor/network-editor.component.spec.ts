import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkEditorComponent } from './network-editor.component';

describe('NetworkEditorComponent', () => {
  let component: NetworkEditorComponent;
  let fixture: ComponentFixture<NetworkEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NetworkEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
