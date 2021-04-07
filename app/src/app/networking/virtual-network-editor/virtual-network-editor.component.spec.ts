import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualNetworkEditorComponent } from './virtual-network-editor.component';

describe('VirtualNetworkEditorComponent', () => {
  let component: VirtualNetworkEditorComponent;
  let fixture: ComponentFixture<VirtualNetworkEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VirtualNetworkEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VirtualNetworkEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
