# Each component in backend/, web/ and mobile/ is self-contained, with its own
# `make setup | dev | check`. These targets pick one component from the repo root.

COMPONENTS := backend web mobile

.PHONY: help $(COMPONENTS) $(COMPONENTS:%=%-setup) $(COMPONENTS:%=%-check) backend-seed

help:
	@echo "Pick one component:"
	@echo "  make backend | make web | make mobile    start it"
	@echo "  make <component>-setup                   install its dependencies"
	@echo "  make <component>-check                   lint and test it"
	@echo "  make backend-seed                        create the first admin staff user (reads backend/.env)"

$(COMPONENTS):
	@$(MAKE) --no-print-directory -C $@ dev

$(COMPONENTS:%=%-setup): %-setup:
	@$(MAKE) --no-print-directory -C $* setup

$(COMPONENTS:%=%-check): %-check:
	@$(MAKE) --no-print-directory -C $* check

backend-seed:
	@$(MAKE) --no-print-directory -C backend seed
