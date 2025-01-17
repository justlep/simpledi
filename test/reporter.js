const {SpecReporter, StacktraceOption} = require('jasmine-spec-reporter');

jasmine.getEnv().clearReporters(); // remove default reporter logs
jasmine.getEnv().addReporter(
    new SpecReporter({
        // add jasmine-spec-reporter
        spec: {
            displayPending: true,
            displayStacktrace: StacktraceOption.PRETTY
        }
    })
);
