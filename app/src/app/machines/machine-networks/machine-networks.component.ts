import { Component, OnInit, OnDestroy, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { empty, forkJoin, Observable, of, Subject, ReplaySubject } from 'rxjs';
import { delay, filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { NetworkingService } from '../../networking/helpers/networking.service';
import { MachinesService } from '../helpers/machines.service';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Nic } from '../models/nic';
import { Network } from '../../networking/models/network';
import { Machine } from '../models/machine';

@Component({
  selector: 'app-machine-networks',
  templateUrl: './machine-networks.component.html',
  styleUrls: ['./machine-networks.component.scss']
})
export class MachineNetworksComponent implements OnInit, OnDestroy, OnChanges
{
  @Input()
  machine: Machine;

  @Input()
  loadNetworks: boolean;

  @Output()
  processing = new EventEmitter();

  @Output()
  finishedProcessing = new EventEmitter();

  @Output()
  load = new EventEmitter();

  @Output()
  machineReboot = new EventEmitter();

  @Output()
  machineStateUpdate = new EventEmitter();

  loading: boolean;
  nics: Nic[] = [];
  publicNetworks: Network[] = [];
  fabricNetworks: Network[] = [];
  finishedLoading: boolean;

  private destroy$ = new Subject();
  private onChanges$ = new ReplaySubject();
  private networks: Network[];

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly networkingService: NetworkingService,
    private readonly machinesService: MachinesService,
    private readonly modalService: BsModalService,
    private readonly toastr: ToastrService)
  {
    this.networkingService.getNetworks()
      .subscribe(networks =>
      {
        for (const network of networks)
        {
          if (network.fabric)
            this.fabricNetworks.push(network);
          else
            this.publicNetworks.push(network);
        }
      }, err =>
      {
        const errorDetails = err.error?.message ? `(${err.error.message})` : '';
        this.toastr.error(`Failed to load the list of available networks for machine "${this.machine.name}" ${errorDetails}`);
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  private getNetworks(force = false)
  {
    if ((this.finishedLoading || this.machine.state === 'provisioning') && !force) return;

    const observables = this.nics.map(x => this.networkingService.getNetwork(x.network));

    this.loading = observables.length > 0;

    forkJoin(observables)
      .subscribe(networks =>
      {
        this.networks = networks;

        for (const nic of this.nics)
        {
          nic.networkDetails = networks.find(x => x.id === nic.network);
          nic.networkName = nic.networkDetails ? nic.networkDetails.name : '';
        }

        this.loading = false;
        this.finishedLoading = true;
        this.load.emit(this.nics);
      },
        err =>
        {
          this.toastr.error(`Couldn't load network details: ${err.error.message}`);
          this.loading = false;
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  addNic(network: Network)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Connecting to a network will cause this machine to reboot. Do you wish to continue?`,
        confirmButtonText: 'Yes, connect to this network',
        declineButtonText: "No, don't connect"
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    modalRef.content.confirm.pipe(
      first(),
      tap(() =>
      {
        this.processing.emit();

        this.toastr.info(`Connecting machine "${this.machine.name}" to the "${network.name}" network...`);
      }),
      switchMap(() =>
      {
        return this.networkingService.addNic(this.machine.id, network.id)
          .pipe(
            tap(x =>
            {
              // Add the newly created NIC to the list, in its "provisioning" state
              this.nics.unshift(x);

              if (this.machine.state === 'running')
                this.machineReboot.emit();
            }),
            switchMap(x =>
            {
              // Grab info about the newly created NIC's network
              return this.networkingService.getNetwork(x.network)
                .pipe(
                  map(y => ({ network: y, nic: x }))
                );
            }),
            switchMap(response =>
            {
              // Keep polling the newly created NIC until it reaches its "running"/"stopped" state
              return this.networkingService
                .getNicUntilAvailable(this.machine, response.nic, network.name, n => this.nics[0].state = n.state)
                .pipe(
                  takeUntil(this.destroy$),
                  map(y => ({ network: response.network, nic: y }))
                );
            })
          );
      })
    )
      .subscribe(response =>
      {
        if (this.nics.length && !this.nics[0].networkDetails)
        {
          const nic = this.nics[0];

          nic.networkDetails = response.network;
          nic.networkName = nic.networkDetails?.name || '';
        }

        this.load.emit(this.nics);

        this.toastr.info(`The machine "${this.machine.name}" has been connected to the "${network.name}" network`);
        this.finishedProcessing.emit();
      },
        err =>
        {
          // Remove the NIC that is hanging
          if (this.nics.length && !this.nics[0].networkDetails)
            this.nics.shift();

          const errorDetails = err.error?.message ? `(${err.error.message})` : '';
          this.toastr.error(`Failed to connect machine "${this.machine.name}" to the "${network.name}" network ${errorDetails}`);
          this.finishedProcessing.emit();
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  deleteNic(nic: Nic)
  {
    const modalConfig = {
      ignoreBackdropClick: true,
      keyboard: false,
      animated: true,
      initialState: {
        prompt: `Disconnecting from the "${nic.networkName}" network will reboot this machine. Do you wish to continue?`,
        confirmButtonText: 'Yes, disconnect from this network',
        declineButtonText: 'No, stay connected',
        confirmByDefault: false
      }
    };

    const modalRef = this.modalService.show(ConfirmationDialogComponent, modalConfig);

    modalRef.content.confirm.pipe(
      first(),
      tap(() =>
      {
        this.processing.emit();

        this.toastr.info(`Removing network interface "${nic.mac.toUpperCase()}" from machine "${this.machine.name}"...`);
      }),
      //filter(() => this.machine.state === 'running' || this.machine.state === 'stopped'),
      switchMap(() =>
      {
        return this.networkingService.deleteNic(this.machine.id, nic.mac)
          .pipe(
            takeUntil(this.destroy$),
            tap(() =>
            {
              if (this.machine.state === 'running')
                this.machineReboot.emit();
            }),
            switchMap(() =>
            {
              // If the machine is currently running, keep polling until it finishes restarting
              return this.machine.state === 'running'
                ? this.machinesService
                  .getMachineUntilNicRemoved(this.machine, nic.networkName, x => this.machineStateUpdate.emit(x))
                  .pipe(delay(1000), takeUntil(this.destroy$))
                : of(nic);
            })
          );
      }),
      switchMap(() => this.networkingService.getNics(this.machine.id))
    ).subscribe(nics =>
    {
      const index = this.nics.findIndex(x => x.network === nic.network);
      if (index >= 0)
        this.nics.splice(index, 1);

      // Perhaps the list of NICs was updated in case the primary NIC was just removed,
      // so another NIC was assigned as the primary one
      for (const networkInterface of nics)
      {
        const found = this.nics.find(x => x.network === networkInterface.network);
        if (found)
          found.primary = networkInterface.primary;
      }

      this.finishedProcessing.emit();

      this.load.emit(this.nics);

      this.toastr.info(`The network interface has been removed from machine "${this.machine.name}"`);
    }, err =>
    {
      this.toastr.error(`Machine "${this.machine.name}" error: ${err.error.message}`);
      this.finishedProcessing.emit();
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  markNicAsReserved(nic: Nic)
  {

  }

  // ----------------------------------------------------------------------------------------------------------------
  toggleCloudFirewall(event, machine: Machine)
  {
    machine.working = true;

    this.machinesService.toggleFirewall(machine.id, event.target.checked)
      .subscribe(() =>
      {
        this.toastr.info(`The cloud firewall for machine "${machine.name}" is now ${event.target.checked ? 'enabled' : 'disabled'}`);
        machine.working = false;
      },
        err =>
        {
          machine.working = false;
          this.toastr.error(`Machine "${machine.name}" error: ${err.error.message}`);
        });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
    if (!this.machine.nics?.length || this.machine.networksLoaded)
      this.finishedLoading = true;

    this.onChanges$.pipe(takeUntil(this.destroy$)).subscribe(() =>
    {
      if (!this.finishedLoading && this.loadNetworks && !this.machine?.networksLoaded)
      {
        this.nics = this.machine?.nics || [];

        this.getNetworks();
      }
    });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnChanges(changes: SimpleChanges): void
  {
    // Since we can't control if ngOnChanges is executed before ngOnInit, we need this trick
    this.onChanges$.next(changes);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnDestroy()
  {
    this.destroy$.next();
  }
}
