import { Component, OnDestroy, OnInit } from '@angular/core';
import { NetworkingService } from '../helpers/networking.service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { distinctUntilChanged, first, takeUntil, debounceTime, filter, switchMap } from 'rxjs/operators';
import { NetworkEditorComponent } from '../network-editor/network-editor.component';
import { ToastrService } from 'ngx-toastr';
import { VirtualNetworkEditorComponent } from '../virtual-network-editor/virtual-network-editor.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { Network } from '../models/network';
import { VirtualAreaNetwork } from '../models/vlan';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import Fuse from 'fuse.js';
import { Subject } from 'rxjs';
import { sortArray } from '../../helpers/utils.service';

@Component({
  selector: 'app-networks',
  templateUrl: './networks.component.html',
  styleUrls: ['./networks.component.scss']
})
export class NetworksComponent implements OnInit, OnDestroy
{
  vlans: VirtualAreaNetwork[];
  listItems: VirtualAreaNetwork[];
  loadingIndicator = true;
  editorForm: FormGroup;

  private readonly fuseJsOptions: {};
  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly networkingService: NetworkingService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService,
    private readonly fb: FormBuilder)
  {
    this.getVlans();

    // Configure FuseJs
    this.fuseJsOptions = {
      includeScore: false,
      minMatchCharLength: 2,
      includeMatches: true,
      shouldSort: false,
      threshold: .3, // Lower value means a more exact search
      keys: [
        { name: 'name', weight: .9 },
        { name: 'networks.name', weight: .7 }
      ]
    };

    this.createForm();
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    this.editorForm = this.fb.group(
      {
        searchTerm: [''],
        sortProperty: ['name']
      });

    this.editorForm.get('searchTerm').valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFiltersAndSort());

    this.editorForm.get('sortProperty').valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFiltersAndSort());
  }

  // ----------------------------------------------------------------------------------------------------------------
  private applyFiltersAndSort()
  {
    let listItems: VirtualAreaNetwork[] = null;

    const searchTerm = this.editorForm.get('searchTerm').value;
    if (searchTerm.length >= 2)
    {
      const fuse = new Fuse(this.vlans, this.fuseJsOptions);
      const fuseResults = fuse.search(searchTerm);
      listItems = fuseResults.map(x => x.item as VirtualAreaNetwork);
    }

    if (!listItems)
      listItems = [...this.vlans];

    this.listItems = sortArray(listItems, this.editorForm.get('sortProperty').value);
  }

  // ----------------------------------------------------------------------------------------------------------------
  setSortProperty(propertyName: string)
  {
    this.editorForm.get('sortProperty').setValue(propertyName);
  }

  // ----------------------------------------------------------------------------------------------------------------
  clearSearch()
  {
    this.editorForm.get('searchTerm').setValue('');
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getVlans()
  {
    this.networkingService.getFabricVirtualLocalAreaNetworks()
      .subscribe(x =>
      {
        //// DEMO ONLY !!!!!
        //const arr = new Array(21);
        //for (let j = 0; j < 21; j++)
        //{
        //  const el = { ...x[0] };
        //  el.name = this.dummyNames[j];
        //  arr[j] = el;
        //}
        //// DEMO ONLY !!!!!

        this.vlans = x.map(v =>
        {
          return v;
        }).filter(n => !n.public);

        this.applyFiltersAndSort();

        this.loadingIndicator = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  getNetworks(expanded: boolean, vlan: VirtualAreaNetwork)
  {
    vlan.expanded = expanded;

    if (!expanded || vlan.networks)
      return;

    vlan.working = true;

    this.networkingService.getFabricNetworks(vlan.vlan_id)
      .subscribe(x =>
      {
        //// DEMO ONLY !!!!!
        //const arr = new Array(21);
        //for (let j = 0; j < 21; j++)
        //{
        //  const el = { ...x[0] };
        //  el.name = this.dummyNames[j];
        //  el.resolvers = this.dummyIPs;

        //  const key: string = this.dummyIPs[j];
        //  el.routes = {
        //    [key]: this.dummyIPs[j]
        //  };
        //  arr[j] = el;
        //}
        //// DEMO ONLY !!!!!

        vlan.networks = x;

        vlan.working = false;
      }, err =>
      {
        this.toastr.error(`Couldn't load the networks for VLAN "${vlan.name}"`);
        vlan.working = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  showVlanEditor(vlan?: VirtualAreaNetwork)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { vlan }
    };

    const modalRef = this.modalService.show(VirtualNetworkEditorComponent, modalConfig);

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      const observable = vlan
        ? this.networkingService.editFabricVirtualLocalAreaNetwork(x.vlan_id, x.name, x.description)
        : this.networkingService.addFabricVirtualLocalAreaNetwork(x);

      observable.subscribe(response =>
      {
        if (vlan)
        {
          vlan.name = x.name;
          vlan.description = x.description;
        }
        else
          this.vlans.push(response);
      }, err =>
      {
        this.toastr.error(err.error.message);
      });
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteVlan(vlan: VirtualAreaNetwork)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete the "${vlan.name}" VLAN?`,
        confirmButtonText: 'Yes, delete this virtual network',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    modalRef.content.confirm.pipe(first()).subscribe(() =>
    {
      this.networkingService.deleteFabricVirtualLocalAreaNetwork(vlan.vlan_id)
        .subscribe(() =>
        {
          const index = this.vlans.findIndex(x => x.vlan_id === vlan.vlan_id);
          if (index >= 0)
          {
            this.vlans.splice(index, 1);

            this.applyFiltersAndSort();
          }

          this.toastr.info(`The "${vlan.name}" virtual network has been deleted`);
        }, err =>
        {
          const errorDetails = err.error?.message ? `(${err.error.message})` : '';
          this.toastr.error(`Failed to remove the "${vlan.name}" virtual network ${errorDetails}`);
        });
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  showNetworkEditor(vlan: VirtualAreaNetwork, network?: Network)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: { vlan, network }
    };

    const modalRef = this.modalService.show(NetworkEditorComponent, modalConfig);
    modalRef.setClass('modal-lg');

    modalRef.content.save.pipe(first()).subscribe(x =>
    {
      if (network)
      {
        // Update existing entry
        network.name = x.name;
        network.subnet = x.subnet;
        network.provision_start_ip = x.provision_start_ip;
        network.provision_end_ip = x.provision_end_ip;
        network.gateway = x.gateway;
        network.resolvers = x.resolvers;
        network.routes = x.routes;
      }
      else
      {
        vlan.networks = vlan.networks || [];
        vlan.networks.push(x);
      }
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteNetwork(vlan: VirtualAreaNetwork, network: Network)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Are you sure you wish to permanently delete the "${vlan.name}" > "${network.name}" network?`,
        confirmButtonText: 'Yes, delete this network',
        declineButtonText: 'No, keep it',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    modalRef.content.confirm.pipe(
      first(),
      switchMap(() => this.networkingService.deleteFabricNetworks(vlan.vlan_id, network.id))
    )
      .subscribe(() =>
      {
        const index = vlan.networks.findIndex(x => x.id === network.id);
        if (index >= 0)
          vlan.networks.splice(index, 1);

        this.toastr.info(`The "${network.name}" network has been deleted`);
      }, err =>
      {
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Failed to remove the "${network.name}" network ${errorDetails}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
