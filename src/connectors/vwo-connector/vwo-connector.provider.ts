import { IExperimentationProvider, IExperiments, IVariants, IVariations, State } from "../../interface";
import VWO from "vwo-node-sdk";
import assert from "assert";

class VwoConnector implements IExperimentationProvider {
    private vwoClientInstance: VWO.vwoInstance | undefined;
    private currentSettingsFile: any;
    private ACCOUNT_ID = '';
    private SDK_KEY = '';

    private mapToState = (status: string): State => {
        switch (status) {
            case 'RUNNING': return State.Running;
            case 'PAUSED': return State.Paused;
            case 'ARCHIVED': return State.Archived;
            case 'TRASHED': return State.Trashed;
            default: return State.Draft;
        }
    }

    private async pollSettingsFile() {
        console.log('[VwoConnector.pollSettingsFile] Polling settings file');
        VWO.getSettingsFile(this.ACCOUNT_ID, this.SDK_KEY)
            .then(latestSettingsFile => {
                try {
                    // If SettingsFile not changed, do not re-initialize
                    assert.deepEqual(this.currentSettingsFile, latestSettingsFile);
                } catch (err) {
                    this.currentSettingsFile = latestSettingsFile;
                    this.vwoClientInstance = VWO.launch({
                        settingsFile: this.currentSettingsFile
                    });
                    console.error('[VwoConnector.pollSettingsFile] Something went wrong in instance initialization.', err);
                }
            })
            .catch(err => {
                console.error('[VwoConnector.pollSettingsFile] Something went wrong in fetching account settings.', err);
            });
    }

    public async initialize(config: any): Promise<boolean> {
        if(!config) {
            return false;
        }
        try {
            this.ACCOUNT_ID = config.accountId.trim();
            this.SDK_KEY = config.sdkKey.trim();
            var POLL_TIME = config.pollTime | 10000; // 10 sec
            console.log(`[VwoConnector.initialize] Account ID: ${this.ACCOUNT_ID}, SDK Key: ${this.SDK_KEY}, Poll Time: ${POLL_TIME}`);
            await this.pollSettingsFile();
        } catch (err) {
            console.error('[VwoConnector.initialize] Something went wrong in fetching config.', err);
            return false;
        }
        var intervalObj;
        clearInterval(intervalObj);
        intervalObj = setInterval(this.pollSettingsFile, POLL_TIME);
        return true;
    }

    public getConfigForClientSideInit(): Promise<any> {
        return VWO.getSettingsFile(this.ACCOUNT_ID, this.SDK_KEY);
    }

    public initializeClientSide(config: any): boolean {
        if (!config) {
            return false;
        }
        try {
            this.vwoClientInstance = VWO.launch({settingsFile: config});
            console.log(`[VwoConnector.initializeClientSide] Client side initialized successfully`);
        } catch (err) {
            console.error('[VwoConnector.initializeClientSide] Something went wrong in initializing client side', err);
            return false;
        }
        return true;
    }

    private getVariationList(campaign: any): IVariations[] {
        if (!campaign) {
            return [];
        }
        const variationList: IVariations[] = [];
        var variationArray = campaign.variations;
        for (let index = 0; index < variationArray.length; index++) {
            var variation: IVariations = {
                friendlyName: variationArray[index].name,
                id: variationArray[index].id,
                status: State.Enabled,   // yet to be confirmed
                weight: variationArray[index].weight
            }
            console.log(`[VwoConnector.getVariationList] variation: ${variation}`);
            variationList.push(variation);
        }
        return variationList;
    }

    public getExperiments(page?: string, items?: string): Promise<IExperiments[]> {
        if (!this.currentSettingsFile) {
            return Promise.reject();
        }
        var campaignList = this.currentSettingsFile.campaigns;
        const experimentList: IExperiments[] = [];
        
        for (let index = 0; index < campaignList.length; index++) {
            var experiment: IExperiments = {
                friendlyName: campaignList[index].name,
                id: campaignList[index].key,
                status: this.mapToState(campaignList[index].status),
                variations: this.getVariationList(campaignList[index])
            };
            console.log(`[VwoConnector.getExperiments] Experiment: ${experiment}`);
            experimentList.push(experiment);
        }
        return Promise.resolve(experimentList);
    }

    private getVariantId(variationName: string, variations: any): string {
        for (let i = 0; i < variations.length; i++) {
            var temp = variations[i];
            if (variationName.localeCompare(temp.name)) {
                return temp.id;
            }
        }
        return '';
    }

    public getVariantsForUser(userId: string, attributes?: { [index: string]: string; }): IVariants[] {
        if (!this.vwoClientInstance) {
            console.error("[VwoConnector.getVariantsForUser] vwoClientInstance not initialized");
            return [];
        }
        let campaignList = this.currentSettingsFile.campaigns;
        const variantList: IVariants[] = [];
        var options = {};

        for (let index = 0; index < campaignList.length; index++) {
            try {
                /*
                @param options from attributes
                */
                var variationName = this.vwoClientInstance.getVariationName(campaignList[index].key, userId, options);
                if (variationName) {
                    var variant: IVariants = {
                        experimentId: campaignList[index].key,
                        variantId: this.getVariantId(variationName, campaignList[index].variations)
                    }
                    console.log(`[VwoConnector.getVariantsForUser] Variation: ${variant}`);
                    variantList.push(variant);
                }
            } catch (err) {
                console.error('[VwoConnector.getVariantsForUser] Something went wrong in getting variation name', err);
            }
        }
        return variantList.length == 0 ? [] : variantList;
    }

    public activateExperiment(userId: string, experiments: IVariants[], attributes?: { [index: string]: string; }): boolean {
        if (!this.vwoClientInstance) {
            console.error("[VwoConnector.activateExperiment] vwoClientInstance not initialized");
            return false;
        }
        var options = {};

        for (let index = 0; index < experiments.length; index++) {
            try {
                 /*
                @param options from attributes
                */
                this.vwoClientInstance.activate(experiments[index].experimentId, userId, options);
                console.log(`[VwoConnector.activateExperiment] Activated experiment ${experiments[index].experimentId} for user ${userId} successfully`);
            } catch (e) {
                console.error(`[VwoConnector.activateExperiment] Something went wrong with activation of ${experiments[index].experimentId} for ${userId}`, e);
            }
        }
        return true;
    }
}

const connector = new VwoConnector();
export default connector;

