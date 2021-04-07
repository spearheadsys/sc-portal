import{ Component, OnInit, OnDestroy, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { NetworkingService } from '../helpers/networking.service';
import { ToastrService } from 'ngx-toastr';
import { VirtualAreaNetwork } from '../models/vlan';
import { AddNetworkRequest, Network } from '../models/network';
import { EditNetworkRequest } from '../models/network';

@Component({
  selector: 'app-network-editor',
  templateUrl: './network-editor.component.html',
  styleUrls: ['./network-editor.component.scss']
})
export class NetworkEditorComponent implements OnInit, OnDestroy
{
  @Input()
  vlan: VirtualAreaNetwork;

  @Input()
  network: Network;

  save = new Subject<Network>();
  loading: boolean;
  working: boolean;
  editorForm: FormGroup;
  canAddResolver: boolean;
  canAddRoute: boolean;
  // IPv4 address with optional /nn on the end with values from 0 - 32
  ipOrSubnetRegex = '^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$';
  // IPv4 address with mandatory /nn on the end with values from 0 - 32
  subnetRegex = '^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))$';
  ipRegex = '^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$';

  private destroy$ = new Subject();

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly modalRef: BsModalRef,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly networkingService: NetworkingService,
    private readonly toastr: ToastrService)
  {    // When the user navigates away from this route, hide the modal
    router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(e => e instanceof NavigationStart)
      )
      .subscribe(() => this.modalRef.hide());
  }

  // ----------------------------------------------------------------------------------------------------------------
  private createForm()
  {
    const resolvers = this.fb.array(this.network?.resolvers
      ? this.network.resolvers.map(ip =>
      {
        return this.fb.group(
          {
            resolver: [ip, Validators.pattern(this.ipRegex)]
          });
      })
      : []
    );

    this.canAddResolver = resolvers.length < 4;

    const routes = this.fb.array(this.network?.routes
      ? Object.keys(this.network.routes).map(key =>
      {
        return this.fb.group(
          {
            key: [key, [Validators.required, Validators.pattern(this.ipOrSubnetRegex)]],
            value: [this.network.routes[key], [Validators.required, Validators.pattern(this.ipRegex)]]
          });
      })
      : []
    );

    this.canAddRoute = routes.length < 4;

    this.editorForm = this.fb.group(
      {
        name: [this.network?.name, Validators.required],
        subnet: [{ value: this.network?.subnet, disabled: !!this.network }, [Validators.required, Validators.pattern(this.subnetRegex)]],
        startIp: [this.network?.provision_start_ip, [Validators.required, Validators.pattern(this.ipRegex)]],
        endIp: [this.network?.provision_end_ip, [Validators.required, Validators.pattern(this.ipRegex)]],
        gateway: [{ value: this.network?.gateway, disabled: !!this.network }, [Validators.required, Validators.pattern(this.ipRegex)]],
        resolvers,
        routes,
        description: [this.network?.description, [Validators.maxLength(64)]],
        nat: [{ value: this.network?.internet_nat, disabled: this.network }]
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  close()
  {
    this.modalRef.hide();
  }

  // ----------------------------------------------------------------------------------------------------------------
  addResolver(resolver: string)
  {
    const array = this.editorForm.get('resolvers') as FormArray;

    const control = this.fb.group(
      {
        resolver: [resolver, Validators.pattern(this.ipRegex)]
      });

    array.push(control);

    this.canAddResolver = array.length < 4;
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeResolver(index: number)
  {
    const array = this.editorForm.get('resolvers') as FormArray;

    array.removeAt(index);

    this.canAddResolver = array.length < 4;
  }

  // ----------------------------------------------------------------------------------------------------------------
  addRoute(route: { key: string; value: string })
  {
    const array = this.editorForm.get('routes') as FormArray;

    const control = this.fb.group(
      {
        key: [route.key, [Validators.required, Validators.pattern(this.ipOrSubnetRegex)]],
        value: [route.value, [Validators.required, Validators.pattern(this.ipRegex)]]
      });

    array.push(control);

    this.canAddRoute = array.length < 4;
  }

  // ----------------------------------------------------------------------------------------------------------------
  removeRoute(index: number)
  {
    const array = this.editorForm.get('routes') as FormArray;

    array.removeAt(index);

    this.canAddRoute = array.length < 4;
  }

  // ----------------------------------------------------------------------------------------------------------------
  private addNetwork(changes: any)
  {
    const network = new AddNetworkRequest();
    network.name = changes.name;
    network.description = changes.description || '';
    network.subnet = changes.subnet;
    network.provision_start_ip = changes.startIp;
    network.provision_end_ip = changes.endIp;
    network.gateway = changes.gateway;
    network.internet_nat = changes.nat;
    network.resolvers = changes.resolvers?.map(x => x.resolver);
    network.routes = changes.routes?.reduce((routes, route) =>
    {
      routes[route.key] = route.value;
      return routes;
    }, {});

    return this.networkingService.addFabricNetwork(this.vlan.vlan_id, network);
  }

  // ----------------------------------------------------------------------------------------------------------------
  private editNetwork(changes: any)
  {
    const network = new EditNetworkRequest();
    network.name = changes.name;
    network.description = changes.description || '';
    network.provision_start_ip = changes.startIp;
    network.provision_end_ip = changes.endIp;
    network.resolvers = changes.resolvers?.map(x => x.resolver);
    network.routes = changes.routes?.reduce((routes, route) =>
    {
      routes[route.key] = route.value;
      return routes;
    }, {});

    return this.networkingService.editFabricNetwork(this.vlan.vlan_id, this.network.id, network);
  }

  // ----------------------------------------------------------------------------------------------------------------
  saveChanges()
  {
    this.working = true;

    const changes = this.editorForm.getRawValue();

    const observable = this.network ? this.editNetwork(changes) : this.addNetwork(changes);

    observable.subscribe(x =>
    {
      const message = this.network
        ? `The "${changes.name}" network has been succesfully updated`
        : `The "${changes.name}" network has been succesfully created`;
      this.toastr.info(message);

      this.working = false;

      this.save.next(x);
      this.modalRef.hide();
    }, err =>
    {
      this.toastr.error(err.error.message);
      this.working = false;
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    if (!this.vlan)
      throw 'You must specify the VLAN';

    this.createForm();
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
