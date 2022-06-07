import { IExperimentationListener } from "../../interface";
import VWO from "vwo-node-sdk";

class VwoConnectorListener implements IExperimentationListener {
    private userId: string = '';
    private vwoClientInstance: VWO.vwoInstance | undefined;

    initializeClientSide(config: any, userId: string): boolean {
        if (!config) {
            return false;
        }
        this.userId = userId;
        try {
            console.log(`[VwoConnectorListener.initializeClientSide] userid: ${userId} config: ${config}`);
            this.vwoClientInstance = VWO.launch({settingsFile: config});
        } catch (err) {
            console.error('[VwoConnectorListener.initializeClientSide] Something went wrong with VWO client initialization.', err);
            return false;
        }
        return true;
    }

    trackEvent(eventType: string, payload: any, attributes?: any): void {
        var experimentIdList = [];
        var options = {};
        try {
            /*
            Convention yet to be confirmed
            @param campaignSpecifier from payload/attributes (if null goal identifier will be tracked across all campaigns)
            @param goalIdentifier from eventType
            @param options from attributes
            */
            console.log(`[VwoConnectorListener.trackEvent] eventType: ${eventType} Payload: ${payload} attributes: ${attributes}`);
            this.vwoClientInstance.track(null, this.userId, eventType, options);
        } catch (err) {
            console.error('[VwoConnectorListener.trackEvent] Something went wrong with track event.', err);
        }
    }
}

const connectorListener = new VwoConnectorListener();
export default connectorListener;


