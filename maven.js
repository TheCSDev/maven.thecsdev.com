/**
 * This is a utility script for automating tasks related to this maven repository.
 * To run this script, you need to have NodeJS installed.
 * 
 * Once NodeJS is installed, example CLI syntax for executing this script:
 *     node.exe maven.js help
 */
// ==================================================
// COMMONLY USED MODULES
// ==================================================
const mFs   = require("node:fs");
const mPath = require("node:path");

const FILENAME = mPath.basename(__filename);

// ==================================================
// INITIALIZATION OF TASK FUNCTIONALITY
// ==================================================
const NAME2TASK = {};
const TASK2NAME = {};

/**
 * Throws a {TypeError} if a given object's type is unexpected.
 * @template T
 * @param {T} obj The object being checked.
 * @param {string} expectedTypes A string with expected types separated by "|".
 * @returns {T} The object that was passed as the argument.
 * @throws {TypeError} If the assertion fails.
 */
function assertType(obj, expectedTypes)
{
	let objType = typeof obj;
	if (`|${expectedTypes}|`.includes(`|${objType}|`))
		return obj;
	throw new TypeError(`Illegal object type. Expected '${expectedTypes}', but got '${objType}' instead.`);
}

/**
 * Retrieves a task using its name.
 * @param {string} name The name of the task.
 * @returns {Function} The task.
 * @throws {TypeError} If a task with the given name does not exist.
 */
function getTask(name)
{
	name = assertType(name, "string").trim().toLowerCase();
	const task = NAME2TASK[name];
	if(task == null)
		throw new TypeError(`Could not find a task with the name '${name}'.`);
	else return task;
}

/**
 * Defines a new task with a given name.
 * @param {string} name The name of the new task.
 * @param {Function} task The task itself.
 */
function addTask(name, task)
{
	name = assertType(name, "string").trim().toLowerCase();
	assertType(task, "function");
	NAME2TASK[name] = task;
	TASK2NAME[task] = name;
}

// ==================================================
// DEFINITIONS OF UTILITY FUNCTIONS
// ==================================================
/**
 * Logs a message to the console.
 * @param {string} level The log level name (ex. INFO, WARN, ERROR).
 * @param {string} caller The name of the caller task.
 * @param {any} message The message to log.
 */
function log(level, caller, message)
{
	level  = (level  != null) ? `[${assertType(level, "string")}]`  : "";
	caller = (caller != null) ? `<${assertType(caller, "string")}>` : "";
	console.log(`[${FILENAME}] ${level} ${caller} ${message}`);
}

function logDebug(message) { log("DEBUG", TASK2NAME[arguments.callee.caller], message); }
function logInfo(message)  { log("INFO",  TASK2NAME[arguments.callee.caller], message); }
function logWarn(message)  { log("WARN",  TASK2NAME[arguments.callee.caller], message); }
function logError(message) { log("ERROR", TASK2NAME[arguments.callee.caller], message); }

// ==================================================
// DEFINITIONS OF TASKS
// ==================================================
// Provides help for executing this script.
addTask("help", () =>
{
	logInfo("This script is used for automating tasks related to this maven repository.");
	logInfo("");
	logInfo("Syntax:");
	logInfo(`    node.exe ${FILENAME} [task_name, task_name, task_name, ...]`);
	logInfo("");
	logInfo("Where:");
	logInfo(`    [task_name] - The name of a task to execute.`);
	logInfo("");
	logInfo("Example:");
	logInfo(`    node.exe ${FILENAME} help`);
	logInfo("");
	logInfo("List of available tasks:");
	logInfo(`    ${Object.keys(NAME2TASK).join(", ")}`);
});
// --------------------------------------------------
// Builds all files for this maven repository.
addTask("build", () =>
{
	getTask("build-poms")();
	getTask("build-checksums")();
	getTask("build-indices")();
});

// Builds missing 'Project Object Model' files, as they are required.
addTask("build-poms", () =>
{
	//prepare
	logInfo("Building POMs...");

	/**
	 * Represents the basic information contained in a POM file.
	 * @param {string} groupId The maven group id.
	 * @param {string} artifactId The maven artifact id.
	 * @param {string} version The maven artifact version.
	 */
	const Pom = class
	{
		static TEMPLATE = `<project xmlns="http://maven.apache.org/POM/4.0.0"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
	<modelVersion>4.0.0</modelVersion>
	<groupId>\${pom.group_id}</groupId>
	<artifactId>\${pom.artifact_id}</artifactId>
	<version>\${pom.version}</version>
</project>`;
		
		constructor(groupId, artifactId, version)
		{
			this.groupId    = assertType(groupId, "string");
			this.artifactId = assertType(artifactId, "string");
			this.version    = assertType(version, "string");
		}

		/**
		 * Finds and returns an array of all maven directories containing a jar file.
		 * @returns {Array<string>}
		 */
		static findArtifactVersionDirs()
		{
			const dir = mPath.resolve(__dirname, "docs");
			return [...new Set(
				mFs.readdirSync(dir, { withFileTypes: true, recursive: true })
					.filter(e => e.isFile() && e.name.endsWith('.jar'))
					.map(e => mPath.dirname(mPath.join(e.parentPath, e.name)))
			)]
		}

		/**
		 * Constructs a Pom instance from a given artifact's version directory.
		 * @param {string} dirPath The absolute path of the artifact version directory.
		 * @returns {Pom}
		 */
		static fromArtifactVersionDir(dirPath)
		{
			// Resolve paths to absolute for consistency
			const absoluteDir  = mPath.resolve(dirPath);
			const absoluteRoot = mPath.resolve(__dirname, "docs");

			// Ensure dirPath is within the Maven root directory
			if (!absoluteDir.startsWith(absoluteRoot))
				throw new Error('The directory path is not within the Maven root directory.');

			// Ensure the directory contains JAR files
			const files = mFs.readdirSync(absoluteDir);
			if (!files.some(file => file.endsWith('.jar')))
				throw new Error('No JAR files found in the provided directory.');

			// Calculate relative path and extract components
			const relativePath = mPath.relative(absoluteRoot, absoluteDir);
			const parts        = relativePath.split(mPath.sep); // Split into path segments

			if (parts.length < 3)
				throw new Error('Invalid Maven directory structure. Expected groupId/artifactId/version.');

			const version    = parts.pop();     // Last segment is version
			const artifactId = parts.pop();     // Second-last segment is artifactId
			const groupId    = parts.join('.'); // Remaining segments form the groupId

			return new Pom(groupId, artifactId, version);
		}

		/**
		 * Builds POM files.
		 */
		static buildPoms()
		{
			//find and iteraate all artifact version directories
			for(const dir of this.findArtifactVersionDirs())
			try
			{
				//obtain POM information, construct it, and generate a POM file
				const dirPom = this.fromArtifactVersionDir(dir);
				const pomFilePath = mPath.resolve(dir, `${dirPom.artifactId}-${dirPom.version}.pom`);
				if(mFs.existsSync(pomFilePath)) continue; //do not override existing files

				const dirPomContents = this.TEMPLATE
					.replaceAll("${pom.group_id}", dirPom.groupId)
					.replaceAll("${pom.artifact_id}", dirPom.artifactId)
					.replaceAll("${pom.version}", dirPom.version);
				logDebug(`Building ${mPath.basename(pomFilePath)}`);
				mFs.writeFileSync(pomFilePath, dirPomContents, { encoding: "utf-8" });
			}
			catch
			{
				//if something goes wrong, log it and move on to the next directory
				logError(`Failed to generate POM for directory: ${dir}`);
				continue;
			}
		}
	};

	//build the pom files
	Pom.buildPoms();
});

// Builds missing checksum files
addTask("build-checksums", () =>
{
	//prepare
	logInfo("Building checksums...");
	const mCrypto = require("node:crypto");

	/**
	 * Hashes a file and saves its hash to the corresponding hash file.
	 * @param {string} filePath The full path of the file.
	 * @param {string} algoName The name of the hashing algorithm
	 */
	const hashFile = (filePath, algoName) =>
	{
		//do not do this if the hash already exists
		const dest = `${filePath}.${algoName}`;
		if(mFs.existsSync(dest)) return;

		//read the file data, hash it, and then save the hash
		logDebug(`Building hash ${mPath.basename(dest)}`);
		const data = mFs.readFileSync(filePath);
		const hash = mCrypto.createHash(algoName).update(data).digest('hex');
		mFs.writeFileSync(dest, hash);
	};

	//obtain and iterate files
	for(const file of mFs.readdirSync(mPath.resolve(__dirname, "docs"), { withFileTypes: true, recursive: true }))
	{
		//skip non-files
		if(!(file.isFile() && !file.isDirectory()))
			continue;

		//skip files with extensions that aren't targetted
		const fileExt = mPath.extname(file.name).toLowerCase();
		if(![".jar", ".pom", ".xml"].includes(fileExt))
			continue;

		//build the checksums for this file
		const filePath = mPath.resolve(file.parentPath, file.name);
		hashFile(filePath, "md5");
		hashFile(filePath, "sha1");
		hashFile(filePath, "sha256");
		hashFile(filePath, "sha512");
	}
});

// Rebuilds index.html files. Only affects updated indices.
addTask("build-indices", () =>
{
	//prepare
	logInfo("Building indices...");
	const docsPath = mPath.resolve(__dirname, "docs");

	const template_index      = mFs.readFileSync(mPath.resolve(__dirname, "docs", "index-template.html"), "utf-8");
	const template_entry_dir  = `<div class="entry">
					<span icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span>
					<span path>\${file.name}</span>
				</div>
				`;
	const template_entry_file = `<div class="entry">
					<span icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg></span>
					<span path>\${file.name}</span>
					<span class="flex-fill"></span>
					<span>\${file.size}</span>
				</div>
				`;
	// ^ note: the tab indentations and spacings are intentional!

	/**
	 * Returns a textual representation of the file's size.
	 * @param {mFs.Dirent} file The file Dirent.
	 * @returns {string}
	 */
	const getFileSize = (file) =>
	{
		if(file.isDirectory()) return "0";
		else return `${mFs.statSync(mPath.resolve(file.parentPath, file.name)).size}`;
	};

	/**
	 * Builds an index.html file for a given maven directory.
	 * @param {string} indexDirPath The path of the directory containing the index.
	 */
	const buildIndex = (indexDirPath) =>
	{
		//obtain destination index file path
		const indexPath = mPath.resolve(indexDirPath, "index.html");

		//build the document contents
		let var_document_path = mPath.relative(docsPath, indexDirPath);
		if(var_document_path.length !== 0)
			var_document_path = `/${var_document_path.replaceAll("\\", "/")}/`;
		else var_document_path = "/";

		let var_body_entries  = "";
		for(const childFile of mFs.readdirSync(
			indexDirPath, { withFileTypes: true, recursive: false })
				.filter(a => a.isFile() || a.isDirectory())   //only include files and directories
				.sort((a, b) => a.name.localeCompare(b.name)) //sort by name first
				.sort((a, b) => a.isFile() - b.isFile())      //then sort by "is file"
		)
		{
			//skip certain file names
			if(["CNAME", "index-template.html", "index.html", "index.css", "index.js", "robots.txt"].includes(childFile.name))
				continue;

			var_body_entries += (childFile.isFile() ? template_entry_file : template_entry_dir)
				.replaceAll("${file.name}", childFile.name)
				.replaceAll("${file.size}", `${getFileSize(childFile)} bytes`);
		}

		let result = template_index
			.replaceAll("${document.path}", var_document_path)
			.replaceAll("${body.entries}",  var_body_entries);

		//save the built file if changes are present
		const oldResult = mFs.existsSync(indexPath) ? mFs.readFileSync(indexPath, "utf-8") : "";
		if(oldResult !== result)
		{
			logDebug(`Building ${mPath.basename(indexDirPath)}/index.html`);
			mFs.writeFileSync(indexPath, result, { encoding: "utf-8" });
		}
	};

	//obtain and iterate directories in the docs directory
	buildIndex(docsPath);
	for(const file of mFs.readdirSync(docsPath, { withFileTypes: true, recursive: true }))
	{
		//skip non-directories
		if(!file.isDirectory()) continue;

		//build the index files for directories
		else buildIndex(mPath.resolve(file.parentPath, file.name));
	}
});
// --------------------------------------------------
// Cleans all built files, excluding certain files such as JARs and POMs.
addTask("clean", () =>
{
	getTask("clean-checksums")();
	getTask("clean-indices")();
});

// Placeholder task that explicitly lets the user know this task is not intended
addTask("clean-poms", () =>
{
	logWarn("Cleaning POM files would result in data-loss, equivalent to cleaning JAR files.");
	logWarn("Therefore, this task was intentionally not implemented.");
});

// Cleans all checksum files.
addTask("clean-checksums", () =>
{
	//prepare
	logInfo("Cleaning checksums...");

	//obtain and iterate files
	for(const file of mFs.readdirSync(mPath.resolve(__dirname, "docs"), { withFileTypes: true, recursive: true }))
	{
		//skip non-files
		if(!file.isFile()) continue;

		//skip files with extensions that aren't targetted
		const fileExt = mPath.extname(file.name).toLowerCase();
		if(![".md5", ".sha1", ".sha256", ".sha512"].includes(fileExt))
			continue;

		//remove the hash file
		logDebug(`Cleaning hash ${file.name}`);
		mFs.unlinkSync(mPath.resolve(file.parentPath, file.name));
	}
});

// Cleans all index.html files.
addTask("clean-indices", () =>
{
	//prepare
	logInfo("Cleaning indices...");

	//obtain and iterate files
	for(const file of mFs.readdirSync(mPath.resolve(__dirname, "docs"), { withFileTypes: true, recursive: true }))
	{
		//skip non-files
		if(!file.isFile()) continue;

		//skip files with extensions that aren't targetted
		else if(file.name.toLowerCase() !== "index.html") continue;

		//remove the hash file
		logDebug(`Cleaning ${mPath.basename(file.parentPath)}/${file.name}`);
		mFs.unlinkSync(mPath.resolve(file.parentPath, file.name));
	}
});
// ==================================================
// STARTUP OF THIS SCRIPT
// ==================================================
//retrieve the command-line arguments
const ARGS = (() =>
{
	let args = process.argv.slice(2) ?? [];
	if(args.length == 0) args = ["help"];
	return args;
})();

/**
 * Runs this script.
 */
async function run()
{
	//check for empty arguments
	if(ARGS.length == 0)
		return logInfo(`Please provide an argument. Use the 'help' argument for help.`);

	//ensure this script is in the right directory, for safety reasons
	if(!mFs.existsSync(mPath.resolve(__dirname, "docs")) ||
		!mFs.existsSync(mPath.resolve(__dirname, "docs", "CNAME")) ||
		!mFs.existsSync(mPath.resolve(__dirname, ".gitattributes")) ||
		!mFs.existsSync(mPath.resolve(__dirname, ".gitignore")) ||
		!mFs.existsSync(mPath.resolve(__dirname, "README.md")))
			return logInfo("Failed to execute. This script is likely misplaced in the wrong directory.");

	//run the tasks
	{
		//obtain the tasks to run
		const tasksToRun = ARGS.map(task => [task, getTask(task)]);

		//run the tasks
		for(const taskToRun of tasksToRun)
		{
			logInfo("==================================================");
			logInfo(`Executing task: ${taskToRun[0]}`);
			logInfo("==================================================");
			let result = taskToRun[1]();
			if(result instanceof Promise)
				await result;
			logInfo("");
		}
		logInfo("==================================================");
	}
}

//run the script
run();