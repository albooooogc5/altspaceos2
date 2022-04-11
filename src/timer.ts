import { getBooleanOption } from "./parameter-set-util";

export class Timer {

    private countdownUpdater: NodeJS.Timeout | null = null

    constructor(
        public count: number,

        private onUpdate: (mmss: string) => void,
        private onZeroReached: () => void = () => {}
        //private isTimerOn: boolean
        
        
    ) {
            //this.setTimer();
    }

    public get isPaused(): boolean {
        return this.countdownUpdater == null;
    }

    public pause = () => {
        if (this.countdownUpdater != null) {
            clearInterval(this.countdownUpdater);
            this.countdownUpdater = null;
        }
    }

    public setValue = (countSeconds: number) => {
        this.count = countSeconds;
        if (this.countdownUpdater == null) {
            this.setTimer();
        }
    }

    public increment = (incrementBy: number) => {
        this.setValue(this.count + incrementBy);
    }

    public getDisplayValue = () => {
        // TODO: Handle times that also include an hour
        const [minutes, seconds] =
        [Math.floor(this.count / 60), this.count % 60].map(
            (n: number) => n.toString().padStart(2, '0'));
        return `${minutes}:${seconds}`;
    }

    isTimeOver: boolean = false;

    private setTimer = () => {
        this.countdownUpdater = setInterval(() =>  {
            if (this.count > 0) {
                this.count--;
                this.updateValue();
            } else {
                if(this.isTimeOver == false){
                this.isTimeOver = true;    
                this.pause();
                this.onZeroReached();

                }

            }
        }, 1000);

        this.updateValue();
    }



    private updateValue = () => {
        const displayValue = this.getDisplayValue();
        this.onUpdate(displayValue);
    }

    public resetValue = () => {
        this.pause();
        this.count = 0;
        this.updateValue();       
    }

    public pauseValue = () => {
        this.pause(); 
    
    }

    public playValue = () => {
        if (this.countdownUpdater != null) {
            clearInterval(this.countdownUpdater);
            this.countdownUpdater = null;
        }
        this.setTimer();     
    }

    





}
