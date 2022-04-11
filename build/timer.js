"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timer = void 0;
class Timer {
    constructor(count, onUpdate, onZeroReached = () => { }
    //private isTimerOn: boolean
    ) {
        this.count = count;
        this.onUpdate = onUpdate;
        this.onZeroReached = onZeroReached;
        this.countdownUpdater = null;
        this.pause = () => {
            if (this.countdownUpdater != null) {
                clearInterval(this.countdownUpdater);
                this.countdownUpdater = null;
            }
        };
        this.setValue = (countSeconds) => {
            this.count = countSeconds;
            if (this.countdownUpdater == null) {
                this.setTimer();
            }
        };
        this.increment = (incrementBy) => {
            this.setValue(this.count + incrementBy);
        };
        this.getDisplayValue = () => {
            // TODO: Handle times that also include an hour
            const [minutes, seconds] = [Math.floor(this.count / 60), this.count % 60].map((n) => n.toString().padStart(2, '0'));
            return `${minutes}:${seconds}`;
        };
        this.isTimeOver = false;
        this.setTimer = () => {
            this.countdownUpdater = setInterval(() => {
                if (this.count > 0) {
                    this.count--;
                    this.updateValue();
                }
                else {
                    if (this.isTimeOver == false) {
                        this.isTimeOver = true;
                        this.pause();
                        this.onZeroReached();
                    }
                }
            }, 1000);
            this.updateValue();
        };
        this.updateValue = () => {
            const displayValue = this.getDisplayValue();
            this.onUpdate(displayValue);
        };
        this.resetValue = () => {
            this.pause();
            this.count = 0;
            this.updateValue();
        };
        this.pauseValue = () => {
            this.pause();
        };
        this.playValue = () => {
            if (this.countdownUpdater != null) {
                clearInterval(this.countdownUpdater);
                this.countdownUpdater = null;
            }
            this.setTimer();
        };
        //this.setTimer();
    }
    get isPaused() {
        return this.countdownUpdater == null;
    }
}
exports.Timer = Timer;
//# sourceMappingURL=timer.js.map