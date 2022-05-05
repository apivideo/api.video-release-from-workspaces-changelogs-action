const fs = require('fs');
const readline = require('readline');
const semver = require('semver')
const core = require('@actions/core');
const { Octokit, App } = require("octokit");
const github = require('@actions/github');
const glob = require("glob")

async function getVersionsFromChangelog(changelogFilePath) {
    const fileStream = fs.createReadStream(changelogFilePath);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentVersion;
    const versions = [];
    for await (const line of rl) {
        const versionRegexResult = /.*\s+\[v?([\d\.]+)\].*/.exec(line);
        if (versionRegexResult) {
            currentVersion = versionRegexResult[1];
            versions[currentVersion] = [];
            continue;
        }

        if (!currentVersion) {
            continue;
        }

        const detailsRegexResult = /\s?-\s?([^\s].*)/.exec(line);
        if (detailsRegexResult) {
            versions[currentVersion].push(detailsRegexResult[1]);
        }
    }
    return versions;
}

function listWorkspaces(path, suffixToIgnore) {
    return new Promise((resolve, reject) => glob(path, (err, files1) => {
        if (err) {
            reject(err);
        } else {
            resolve(files1
                .map((f) => {
                    const changeLogPath = f + "/CHANGELOG.md";
                    const packageJsonPath = f + "/package.json";

                    if (fs.existsSync(changeLogPath) && fs.existsSync(packageJsonPath)) {
                        let packageName = JSON.parse(fs.readFileSync(packageJsonPath)).name;
                        if (packageName && suffixToIgnore.length > 0 && packageName.indexOf(suffixToIgnore) === 0) {
                            packageName = packageName.substring(suffixToIgnore.length);
                        }
                        return ({
                            package: packageName,
                            changelog: changeLogPath,
                        });
                    }
                }).filter(a => a !== undefined));
        }
    }));
}

async function findNpmWorkspacesChangelogs(suffixToIgnore) {
    let packageJson;
    try {
        packageJson = JSON.parse(fs.readFileSync("package.json"));
    } catch (e) {
        throw new Error(`Could not read package.json: ${e}`);
    }

    if (!packageJson.workspaces || packageJson.workspaces.length === 0) {
        throw new Error(`No workspace found in package.json`);
    }

    const res = await Promise.all(packageJson.workspaces.map(w => listWorkspaces(w, suffixToIgnore)));

    let files = [];
    res.forEach(rr => {
        rr.forEach(r => {
            if (!files.find(f => f.changelog === r.changelog && f.package === r.package)) {
                files = files.concat(r);
            }
        });
    });
    return files;
}

(async () => {
    try {
        const githubAuthToken = core.getInput('github-auth-token', { required: true });
        const suffixToIgnore = core.getInput('package-name-suffix-to-ignore', { required: false });

        const octokit = github.getOctokit(githubAuthToken);

        const allReleases = (await octokit
            .paginate(octokit.rest.repos.listReleases, {
                repo: github.context.repo.repo,
                owner: github.context.repo.owner,
            })).map(a => ({
                name: a.name,
                draft: a.draft,
                id: a.id,
            }));



        const changelogs = await findNpmWorkspacesChangelogs(suffixToIgnore);
        changelogs.forEach(async (c) => {
            const changelogVersions = await getVersionsFromChangelog(c.changelog);
            const lastChangelogVersion = Object.keys(changelogVersions)[0];
            const lastChangelogDetails = changelogVersions[lastChangelogVersion];

            const versionName = c.package + "@" + lastChangelogVersion;

            const lastPackageRelease = allReleases.filter((release) => release.name.indexOf(c.package) === 0)[0];
            const lastPackageReleaseName = lastPackageRelease ? lastPackageRelease.name.substring(lastPackageRelease.name.indexOf("@")) : undefined;
            const lastPackageReleaseVersion = lastPackageRelease ? lastPackageReleaseName.split("@")[1] : undefined;

            if (!lastPackageReleaseVersion || semver.lte(lastPackageReleaseVersion, lastChangelogVersion)) {
                if (lastPackageReleaseVersion && semver.eq(lastPackageReleaseVersion, lastChangelogVersion)) {
                    if (lastPackageRelease.draft) {
                        await octokit.rest.repos.deleteRelease({
                            repo: github.context.repo.repo,
                            owner: github.context.repo.owner,
                            release_id: lastPackageRelease.id,
                        });
                        core.info(`Draft release ${versionName} already exists. Replacing it.`);
                    } else {
                        core.info(`The release ${versionName} already exists. Nothing will be done.`);
                        return;
                    }
                }
            }

            const payload = {
                repo: github.context.repo.repo,
                owner: github.context.repo.owner,
                draft: true,
                prerelease: false,
                body: lastChangelogDetails.map(s => "- " + s).join("\n"),
                tag_name: versionName,
                name: versionName,
            };
            await octokit.rest.repos.createRelease(payload);
            core.info(`Draft release ${versionName} has been created.`)
        });


    } catch (error) {
        core.setFailed(error.message);
    }
})();