package cli

import (
	"bytes"
	"context"
	"embed"
	"fmt"
	"strings"
	"text/template"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/rs/zerolog/log"

	v1 "github.com/dyrector-io/dyrectorio/golang/api/v1"
	containerbuilder "github.com/dyrector-io/dyrectorio/golang/pkg/builder/container"
	dagentutils "github.com/dyrector-io/dyrectorio/golang/pkg/dagent/utils"
	dockerhelper "github.com/dyrector-io/dyrectorio/golang/pkg/helper/docker"
)

type DyrectorioStack struct {
	Containers     Containers
	Traefik        *containerbuilder.DockerContainerBuilder
	Crux           *containerbuilder.DockerContainerBuilder
	CruxMigrate    *containerbuilder.DockerContainerBuilder
	CruxUI         *containerbuilder.DockerContainerBuilder
	Kratos         *containerbuilder.DockerContainerBuilder
	KratosMigrate  *containerbuilder.DockerContainerBuilder
	CruxPostgres   *containerbuilder.DockerContainerBuilder
	KratosPostgres *containerbuilder.DockerContainerBuilder
	MailSlurper    *containerbuilder.DockerContainerBuilder
}

const (
	ContainerNetDriver = "bridge"
	PodmanHost         = "host.containers.internal"
	DockerHost         = "host.docker.internal"
)

const (
	UpCommand   = "up"
	DownCommand = "down"
)

type traefikFileProviderData struct {
	InternalHost string
	CruxUIPort   uint
	CruxPort     uint
}

//go:embed traefik.yaml.tmpl
var traefikTmpl embed.FS

func ProcessCommand(settings *Settings) {
	containers := DyrectorioStack{
		Containers: settings.Containers,
	}
	switch settings.Command {
	case UpCommand:
		settings = CheckAndUpdatePorts(settings)
		if settings.SettingsWrite {
			SaveSettings(settings)
		}

		containers.Traefik = GetTraefik(settings)
		containers.Crux = GetCrux(settings)
		containers.CruxMigrate = GetCruxMigrate(settings)
		containers.CruxUI = GetCruxUI(settings)
		containers.Kratos = GetKratos(settings)
		containers.KratosMigrate = GetKratosMigrate(settings)
		containers.CruxPostgres = GetCruxPostgres(settings)
		containers.KratosPostgres = GetKratosPostgres(settings)
		containers.MailSlurper = GetMailSlurper(settings)

		StartContainers(&containers, settings)
		PrintInfo(settings)
	case DownCommand:
		StopContainers(&containers)
		log.Info().Msg("Stack is stopped. Hope you had fun! 🎬")
	default:
		log.Fatal().Msg("invalid command")
	}
}

// Create and Start containers
func StartContainers(containers *DyrectorioStack, settings *Settings) {
	traefik, err := containers.Traefik.Create()
	if err != nil {
		log.Fatal().Err(err).Stack().Send()
	}

	TraefikConfiguration(
		containers.Containers.Traefik.Name,
		settings.InternalHostDomain,
		settings.SettingsFile.CruxHTTPPort,
		settings.SettingsFile.CruxUIPort,
	)

	err = traefik.Start()
	if err != nil {
		log.Fatal().Err(err).Stack().Send()
	}
	log.Info().Str("container", containers.Containers.Traefik.Name).Msg("started:")

	err = containers.CruxPostgres.CreateAndStart()
	if err != nil {
		log.Fatal().Err(err).Stack().Send()
	}
	log.Info().Str("container", containers.Containers.CruxPostgres.Name).Msg("started:")

	err = containers.KratosPostgres.CreateAndStart()
	if err != nil {
		log.Fatal().Err(err).Stack().Send()
	}
	log.Info().Str("container", containers.Containers.KratosPostgres.Name).Msg("started:")

	log.Info().Str("container", containers.Containers.KratosMigrate.Name).Msg("migration started:")
	_, err = containers.KratosMigrate.CreateAndWaitUntilExit()
	if err != nil {
		log.Fatal().Err(err).Stack().Send()
	}
	log.Info().Str("container", containers.Containers.KratosMigrate.Name).Msg("migration done:")

	err = containers.Kratos.CreateAndStart()
	if err != nil {
		log.Fatal().Err(err).Stack().Send()
	}
	log.Info().Str("container", containers.Containers.Kratos.Name).Msg("started:")

	if !containers.Containers.Crux.Disabled {
		log.Info().Str("container", containers.Containers.CruxMigrate.Name).Msg("migration started:")
		_, err = containers.CruxMigrate.CreateAndWaitUntilExit()
		if err != nil {
			log.Fatal().Err(err).Stack().Send()
		}
		log.Info().Str("container", containers.Containers.CruxMigrate.Name).Msg("migration done:")

		err = containers.Crux.CreateAndStart()
		if err != nil {
			log.Fatal().Err(err).Stack().Send()
		}
		log.Info().Str("container", containers.Containers.Crux.Name).Msg("started:")
	}

	if !containers.Containers.CruxUI.Disabled {
		err = containers.CruxUI.CreateAndStart()
		if err != nil {
			log.Fatal().Err(err).Stack().Send()
		}
		log.Info().Str("container", containers.Containers.CruxUI.Name).Msg("started:")
	}

	err = containers.MailSlurper.CreateAndStart()
	if err != nil {
		log.Fatal().Err(err).Stack().Send()
	}
	log.Info().Str("container", containers.Containers.MailSlurper.Name).Msg("started:")
}

// Cleanup for "down" command
func StopContainers(containers *DyrectorioStack) {
	ctx := context.Background()

	containerNames := []string{
		containers.Containers.MailSlurper.Name,
	}

	if !containers.Containers.CruxUI.Disabled {
		containerNames = append(containerNames, containers.Containers.CruxUI.Name)
	}

	if !containers.Containers.Crux.Disabled {
		containerNames = append(containerNames,
			containers.Containers.Crux.Name,
			containers.Containers.CruxMigrate.Name)
	}

	containerNames = append(containerNames,
		containers.Containers.KratosMigrate.Name,
		containers.Containers.Kratos.Name,
		containers.Containers.CruxPostgres.Name,
		containers.Containers.KratosPostgres.Name,
		containers.Containers.Traefik.Name)

	for i := range containerNames {
		err := dockerhelper.DeleteContainerByName(ctx, containerNames[i])
		if err != nil {
			log.Debug().Err(err).Send()
		}
	}
}

// Copy to Traefik Container
func TraefikConfiguration(name, internalHostDomain string, cruxPort, cruxUIPort uint) {
	const funct = "TraefikConfiguration"
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatal().Err(err).Stack().Msg(funct)
	}

	traefikFileProviderTemplate, err := traefikTmpl.ReadFile("traefik.yaml.tmpl")
	if err != nil {
		log.Fatal().Err(err).Stack().Msg("couldn't read embedded file")
	}

	traefikConfig, err := template.New("traefikconfig").Parse(string(traefikFileProviderTemplate))
	if err != nil {
		log.Fatal().Err(err).Stack().Msg(funct)
	}

	var result bytes.Buffer

	traefikData := traefikFileProviderData{
		InternalHost: internalHostDomain,
		CruxUIPort:   cruxUIPort,
		CruxPort:     cruxPort,
	}

	err = traefikConfig.Execute(&result, traefikData)
	if err != nil {
		log.Fatal().Err(err).Stack().Msg(funct)
	}

	data := v1.UploadFileData{
		FilePath: "/etc",
		UID:      0,
		GID:      0,
	}

	err = dagentutils.WriteContainerFile(
		context.Background(),
		cli,
		name,
		"traefik/dynamic_conf.yml",
		data,
		int64(len([]rune(result.String()))),
		strings.NewReader(result.String()),
	)

	if err != nil {
		log.Fatal().Err(err).Stack().Msg(funct)
	}
}

func EnsureNetworkExists(settings *Settings) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatal().Err(err).Stack().Send()
	}

	filter := filters.NewArgs()
	filter.Add("name", fmt.Sprintf("^%s$", settings.SettingsFile.Network))

	networks, err := cli.NetworkList(context.Background(),
		types.NetworkListOptions{
			Filters: filter,
		})
	if err != nil {
		log.Fatal().Err(err).Stack().Send()
	}

	if len(networks) == 0 {
		opts := types.NetworkCreate{
			Driver: ContainerNetDriver,
		}

		resp, err := cli.NetworkCreate(context.Background(), settings.SettingsFile.Network, opts)
		log.Info().Str("responseId", resp.ID).Msg("Network created with ")
		if err != nil {
			log.Fatal().Err(err).Stack().Send()
		}
		return
	}

	for i := range networks {
		if networks[i].Driver != ContainerNetDriver {
			log.Fatal().
				Str("network", settings.SettingsFile.Network).
				Str("driver", ContainerNetDriver).
				Msg("network exists, but doesn't have the correct driver")
		} else {
			return
		}
	}

	log.Fatal().Msg("unknown network error")
}
