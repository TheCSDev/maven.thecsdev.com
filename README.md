# TheCSDev Maven
This repository's purpose is to host TheCSDev's Maven repository using GitHub Pages.

### Usage in a Gradle project
Below is a step-by-step guide on implementing this Maven repository in your Gradle project.

**Step 1:**  
Add this maven repository to your project's `build.gradle`.

```gradle
repositories
{
	maven { url = "https://maven.thecsdev.com/" }
}
```

**Step 2:**  
Add a dependency to your project's `build.gradle`.  
Below is an example Minecraft mod dependency implementation.

```gradle
dependencies
{
	//modImplementation "groupId:artifactId:version"
	modImplementation "io.github.thecsdev:tcdcommons:3.12.6+fabric-1.21.4"
	modImplementation "io.github.thecsdev:betterstats:3.13.6+fabric-1.21.4"
}
```